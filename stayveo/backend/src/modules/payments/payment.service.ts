import { BookingStatus, PaymentLifecycleState, PaymentStatus, PaymentType, Prisma } from '@prisma/client';
import { paymentRepository } from './payment.repository.js';
import { createPaymentSchema, verifyPaymentSchema } from './payment.schema.js';
import type { CreatePaymentInput, VerifyPaymentInput } from './payment.schema.js';
import { receiptService } from '../bookings/receipt.service.js';
import { notificationQueue } from '../notifications/notification.queue.js';
import { calculatePgPayment } from './payment-calculator.js';
import { paymentAuditService } from './payment-audit.service.js';
import { razorpayClient } from './razorpay.client.js';
import { createReservationId } from '../bookings/reservation.util.js';
import prisma from '../../common/db/prisma.js';

type DbClient = typeof prisma | Prisma.TransactionClient;

const terminalFailureStates = [
  PaymentLifecycleState.PAYMENT_FAILED,
  PaymentLifecycleState.VERIFICATION_FAILED,
  PaymentLifecycleState.TRANSFER_FAILED,
  PaymentLifecycleState.REFUNDED,
  PaymentLifecycleState.CANCELLED,
];

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentResponse(payment: any) {
  return {
    ...payment,
    razorpay: payment.providerOrderId
      ? {
          keyId: razorpayClient.keyId(),
          orderId: payment.providerOrderId,
          amount: Math.round(number(payment.studentPayable || payment.amount) * 100),
          currency: payment.currency || 'INR',
        }
      : null,
  };
}

async function authoritativeReservationFee(client: DbClient, booking: any) {
  if (booking.roomId) {
    const [room, legacy] = await Promise.all([
      client.roomListing.findUnique({ where: { id: booking.roomId }, select: { providerId: true, reservationFee: true } }),
      client.pGDetails.findUnique({ where: { id: booking.roomId }, select: { reservationFee: true } }),
    ]);
    if (room && room.providerId !== booking.providerId) throw { statusCode: 403, message: 'Booking property ownership mismatch' };
    if (room) return number(room.reservationFee);
    if (legacy) return number(legacy.reservationFee);
  }
  return number(booking.reservationFee);
}

async function createPgPaymentIntent(data: CreatePaymentInput, actorUserId: string) {
  if (!data.booking_id) throw { statusCode: 400, message: 'A booking is required for a PG reservation payment' };
  const idempotencyKey = data.idempotency_key || `booking:${data.booking_id}`;

  const payment = await prisma.$transaction(async (tx) => {
    const existingByKey = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      if (existingByKey.userId !== actorUserId || existingByKey.bookingId !== data.booking_id) {
        throw { statusCode: 409, message: 'This payment request has already been used' };
      }
      return existingByKey;
    }

    const active = await tx.payment.findFirst({
      where: { bookingId: data.booking_id, userId: actorUserId, lifecycleState: { notIn: terminalFailureStates } },
      orderBy: { createdAt: 'desc' },
    });
    if (active) return active;

    const booking = await tx.booking.findUnique({ where: { id: data.booking_id }, include: { payments: true } });
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (booking.userId !== actorUserId) throw { statusCode: 403, message: 'Payment does not belong to this booking' };
    if (data.provider_id && booking.providerId !== data.provider_id) throw { statusCode: 403, message: 'Payment provider does not match the booking' };

    const reservationFee = await authoritativeReservationFee(tx, booking);
    const calculation = calculatePgPayment(reservationFee);
    if (calculation.baseAmount < calculation.platformFee) {
      throw { statusCode: 400, message: 'The reservation fee is below the platform commission' };
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { reservationFee: calculation.baseAmount, platformFee: calculation.platformFee, price: calculation.studentPayable },
    });

    const created = await tx.payment.create({
      data: {
        bookingId: booking.id,
        userId: actorUserId,
        providerId: booking.providerId,
        amount: calculation.studentPayable,
        type: PaymentType.RESERVATION,
        status: PaymentStatus.PENDING,
        lifecycleState: PaymentLifecycleState.INITIATED,
        paymentMethod: 'RAZORPAY',
        idempotencyKey,
        paymentGateway: 'razorpay',
        currency: 'INR',
        reservationFee: calculation.baseAmount,
        platformFee: calculation.platformFee,
        ownerAmount: calculation.ownerAmount,
        studentPayable: calculation.studentPayable,
        commissionBearer: calculation.commissionBearer,
        pricingSnapshot: {
          productType: calculation.productType,
          baseAmount: calculation.baseAmount,
          platformFee: calculation.platformFee,
          ownerAmount: calculation.ownerAmount,
          studentPayable: calculation.studentPayable,
          commissionBearer: calculation.commissionBearer,
          capturedAt: new Date().toISOString(),
        },
      },
    });

    await paymentAuditService.record({
      eventType: 'PAYMENT_SNAPSHOT_CREATED', actorUserId, paymentId: created.id, bookingId: booking.id,
      baseAmount: calculation.baseAmount, platformFee: calculation.platformFee,
      ownerAmount: calculation.ownerAmount, studentPayable: calculation.studentPayable,
      metadata: { commissionBearer: calculation.commissionBearer, productType: 'PG' },
    }, tx);
    return created;
  });

  if (payment.providerOrderId) return paymentResponse(payment);

  try {
    const order = await razorpayClient.createOrder({
      amount: number(payment.studentPayable || payment.amount), currency: payment.currency || 'INR',
      receipt: `SV-${payment.bookingId || payment.id}`, notes: { paymentId: payment.id, bookingId: payment.bookingId || '' },
    });
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.payment.update({
        where: { id: payment.id, lifecycleState: PaymentLifecycleState.INITIATED },
        data: { providerOrderId: order.id, lifecycleState: PaymentLifecycleState.ORDER_CREATED, paymentGateway: 'razorpay' },
      });
      await paymentAuditService.record({
        eventType: 'RAZORPAY_ORDER_CREATED', actorUserId, paymentId: current.id, bookingId: current.bookingId || undefined,
        gatewayOrderId: order.id, baseAmount: number(current.reservationFee), platformFee: number(current.platformFee),
        ownerAmount: number(current.ownerAmount), studentPayable: number(current.studentPayable),
      }, tx);
      return current;
    });
    return paymentResponse(updated);
  } catch (error) {
    await prisma.payment.updateMany({ where: { id: payment.id, lifecycleState: PaymentLifecycleState.INITIATED }, data: { status: PaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.PAYMENT_FAILED } });
    throw error;
  }
}

async function activatePgBooking(paymentId: string, actorUserId: string, gatewayPaymentId: string, gatewayOrderId: string, webhookEventId?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== actorUserId) throw { statusCode: 404, message: 'Payment not found' };
    if (payment.lifecycleState === PaymentLifecycleState.COMPLETED) return { payment, booking: await tx.booking.findUnique({ where: { id: payment.bookingId || '' } }), newlyCompleted: false };
    if (!payment.bookingId) throw { statusCode: 400, message: 'Payment is not attached to a booking' };

    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (!booking || booking.userId !== actorUserId) throw { statusCode: 404, message: 'Booking not found' };

    // Claim the payment before touching inventory. This makes frontend retry
    // and duplicate webhook delivery safe: only one transaction can commit the
    // booking/inventory side effects for a payment.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, lifecycleState: { in: [PaymentLifecycleState.ORDER_CREATED, PaymentLifecycleState.PROCESSING, PaymentLifecycleState.CAPTURED, PaymentLifecycleState.VERIFIED] } },
      data: { lifecycleState: PaymentLifecycleState.PROCESSING, providerPaymentId: gatewayPaymentId, transactionId: gatewayPaymentId },
    });
    if (!claimed.count) {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (current?.lifecycleState === PaymentLifecycleState.COMPLETED) {
        return { payment: current, booking, newlyCompleted: false };
      }
      throw { statusCode: 409, message: 'Payment is already being reconciled' };
    }

    let reservationId = booking.reservationId;
    if (!reservationId) {
      reservationId = createReservationId(booking.roomId || booking.id, booking.bookingDate);
      await tx.booking.update({ where: { id: booking.id }, data: { reservationId } });
    }

    if (booking.roomId) {
      const roomListing = await tx.roomListing.findUnique({ where: { id: booking.roomId }, select: { id: true, providerId: true, availableBeds: true, isActive: true } });
      if (roomListing) {
        const quantity = booking.numberOfBeds || 1;
        const updated = await tx.roomListing.updateMany({
          where: { id: roomListing.id, providerId: booking.providerId, availableBeds: { gte: quantity } },
          data: { availableBeds: { decrement: quantity }, reservedBeds: { increment: quantity } },
        });
        if (updated.count !== 1) throw { statusCode: 409, message: 'The last available bed was just reserved by another student' };
        await tx.roomListing.update({ where: { id: roomListing.id }, data: { status: roomListing.isActive && roomListing.availableBeds - quantity > 0 ? 'ACTIVE' : roomListing.isActive ? 'FULL' : 'CLOSED' } });
      }
    }

    const updatedPayment = await tx.payment.updateMany({
      where: { id: payment.id, lifecycleState: PaymentLifecycleState.PROCESSING },
      data: { status: PaymentStatus.PAID, lifecycleState: PaymentLifecycleState.COMPLETED, providerPaymentId: gatewayPaymentId, transactionId: gatewayPaymentId, verifiedAt: new Date(), paidAt: new Date(), ...(webhookEventId ? { lastWebhookEventId: webhookEventId } : {}) },
    });
    if (!updatedPayment.count) {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (current?.lifecycleState === PaymentLifecycleState.COMPLETED) return { payment: current, booking };
      throw { statusCode: 409, message: 'Payment state changed before booking activation' };
    }

    await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.ACCEPTED } });
    const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    await paymentAuditService.record({
      eventType: 'PAYMENT_VERIFIED', actorUserId, paymentId: current.id, bookingId: booking.id,
      gatewayOrderId, gatewayPaymentId, baseAmount: number(current.reservationFee), platformFee: number(current.platformFee),
      ownerAmount: number(current.ownerAmount), studentPayable: number(current.studentPayable),
      metadata: { bookingActivated: true, inventoryCommitted: Boolean(booking.roomId) },
    }, tx);
    return { payment: current, booking: await tx.booking.findUnique({ where: { id: booking.id } }), newlyCompleted: true };
  });

  if (result.booking && result.newlyCompleted) {
    await receiptService.createForSuccessfulPayment(result.booking.id, result.payment);
    notificationQueue.enqueue({ type: 'PAYMENT_SUCCESS', bookingId: result.booking.id, reservationId: result.booking.reservationId || undefined });
  }
  return result;
}

export const paymentService = {
  async create(input: CreatePaymentInput, actorUserId: string) {
    const data = createPaymentSchema.parse(input);
    if (data.user_id !== actorUserId) throw { statusCode: 403, message: 'Payment user does not match the authenticated student' };
    if (data.type === 'reservation') return createPgPaymentIntent(data, actorUserId);
    const payment = await paymentRepository.create({ ...data, status: 'pending' });
    return payment;
  },

  async verify(input: VerifyPaymentInput, actorUserId: string) {
    const data = verifyPaymentSchema.parse(input);
    const payment = await prisma.payment.findUnique({ where: { id: data.payment_id } });
    if (!payment || payment.userId !== actorUserId) throw { statusCode: 404, message: 'Payment not found' };
    if (payment.providerOrderId !== data.razorpay_order_id) throw { statusCode: 400, message: 'Razorpay order does not match the payment' };
    if (payment.lifecycleState === PaymentLifecycleState.COMPLETED) return paymentResponse(payment);
    if (!razorpayClient.verifyCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
      await prisma.payment.updateMany({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.VERIFICATION_FAILED } });
      throw { statusCode: 400, message: 'Razorpay payment signature is invalid' };
    }
    const gatewayPayment = await razorpayClient.fetchPayment(data.razorpay_payment_id);
    if (gatewayPayment?.order_id !== data.razorpay_order_id || gatewayPayment?.status !== 'captured' || Number(gatewayPayment.amount) !== Math.round(number(payment.studentPayable || payment.amount) * 100)) {
      await prisma.payment.updateMany({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.VERIFICATION_FAILED } });
      throw { statusCode: 400, message: 'Razorpay payment could not be independently verified' };
    }
    return activatePgBooking(payment.id, actorUserId, data.razorpay_payment_id, data.razorpay_order_id);
  },

  async reconcileCapturedPayment(paymentId: string, gatewayPaymentId: string, gatewayOrderId: string, webhookEventId?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return null;
    return activatePgBooking(payment.id, payment.userId, gatewayPaymentId, gatewayOrderId, webhookEventId);
  },

  async listByProvider(providerId: string) { return paymentRepository.findByProvider(providerId); },
  async getEarnings(providerId: string) { return paymentRepository.getEarnings(providerId); },
};
