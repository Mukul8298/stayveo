import { PaymentLifecycleState, Prisma, TiffinPaymentMethod, TiffinPaymentStatus, TiffinSubscriptionStatus } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import { calculateTiffinPayment } from '../payments/payment-calculator.js';
import { paymentAuditService } from '../payments/payment-audit.service.js';
import { razorpayClient } from '../payments/razorpay.client.js';
type DbClient = typeof prisma | Prisma.TransactionClient;

function configuredMode() {
  const mode = String(process.env.PAYMENT_MODE || '').trim().toLowerCase();
  if (mode === 'razorpay') return 'razorpay';

  // Razorpay is the only supported Tiffin gateway. When the deployment has
  // the configured test credentials but omits the legacy feature flag, use
  // those credentials instead of incorrectly reporting a disabled gateway.
  const hasCredentials = Boolean(String(process.env.key_id || '').trim() && String(process.env.key_secret || '').trim());
  return hasCredentials ? 'razorpay' : 'none';
}

function sameAmount(left: unknown, right: number) {
  const parsed = Number(left);
  return Number.isFinite(parsed) && parsed.toFixed(2) === right.toFixed(2);
}

function assertRazorpay() {
  if (configuredMode() !== 'razorpay') throw { statusCode: 503, message: 'Razorpay payment integration is not enabled' };
}

export function getTiffinPaymentConfig() {
  const enabled = configuredMode() === 'razorpay';
  return {
    mode: enabled ? 'razorpay' : 'none',
    provider: enabled ? 'razorpay' : null,
    enabled,
    testOnly: true,
    label: enabled ? 'Secure Razorpay test checkout' : 'Payment integration is not enabled.',
  };
}

export const tiffinPaymentService = {
  async createPendingPayment(client: DbClient, input: {
    subscriptionId: string;
    reservationReference: string;
    kitchenId: string;
    customerId: string;
    amount: number;
    idempotencyKey: string;
    planType: string;
    mealsPerDay?: number;
    isRenewal?: boolean;
  }) {
    assertRazorpay();
    const existing = await client.tiffinPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.subscriptionId !== input.subscriptionId || existing.kitchenId !== input.kitchenId || existing.customerId !== input.customerId || !sameAmount(existing.baseAmount, Number(input.amount))) {
        throw { statusCode: 409, message: 'This payment request does not match the reservation' };
      }
      return existing;
    }

    const calculation = calculateTiffinPayment({
      baseAmount: Number(input.amount),
      planType: input.planType,
      mealsPerDay: input.mealsPerDay || 1,
      isRenewal: Boolean(input.isRenewal),
    });
    const payment = await client.tiffinPayment.create({
      data: {
        subscriptionId: input.subscriptionId,
        kitchenId: input.kitchenId,
        customerId: input.customerId,
        idempotencyKey: input.idempotencyKey,
        paymentGateway: 'razorpay',
        paymentMethod: TiffinPaymentMethod.UPI,
        status: TiffinPaymentStatus.PENDING,
        lifecycleState: PaymentLifecycleState.INITIATED,
        planType: calculation.planType,
        mealsPerDay: calculation.mealsPerDay || 0,
        isRenewal: Boolean(input.isRenewal),
        commissionBearer: calculation.commissionBearer,
        baseAmount: calculation.baseAmount,
        platformFee: calculation.platformFee,
        ownerAmount: calculation.ownerAmount,
        totalAmount: calculation.studentPayable,
        pricingSnapshot: calculation,
        currency: 'INR',
      },
    });
    await paymentAuditService.record({
      eventType: 'PAYMENT_SNAPSHOT_CREATED', tiffinPaymentId: payment.id, subscriptionId: input.subscriptionId,
      baseAmount: calculation.baseAmount, platformFee: calculation.platformFee,
      ownerAmount: calculation.ownerAmount, studentPayable: calculation.studentPayable,
      metadata: { productType: 'TIFFIN', planType: calculation.planType, mealsPerDay: calculation.mealsPerDay, isRenewal: calculation.isRenewal },
    }, client);
    return payment;
  },

  async createGatewayOrder(paymentId: string, reservationReference: string) {
    assertRazorpay();
    const payment = await prisma.tiffinPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw { statusCode: 404, message: 'Tiffin payment not found' };
    if (payment.providerOrderId) return payment;
    const order = await razorpayClient.createOrder({
      amount: Number(payment.totalAmount), currency: payment.currency || 'INR', receipt: `TIF-${reservationReference}`,
      notes: { paymentId: payment.id, subscriptionId: payment.subscriptionId },
    });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.tiffinPayment.update({ where: { id: payment.id, lifecycleState: PaymentLifecycleState.INITIATED }, data: { providerOrderId: order.id, lifecycleState: PaymentLifecycleState.ORDER_CREATED } });
      await paymentAuditService.record({ eventType: 'RAZORPAY_ORDER_CREATED', tiffinPaymentId: updated.id, subscriptionId: updated.subscriptionId, gatewayOrderId: order.id, baseAmount: Number(updated.baseAmount), platformFee: Number(updated.platformFee), ownerAmount: Number(updated.ownerAmount), studentPayable: Number(updated.totalAmount) }, tx);
      return updated;
    });
  },

  async verifyGatewayPayment(paymentId: string, input: { orderId: string; paymentId: string; signature: string }) {
    assertRazorpay();
    const payment = await prisma.tiffinPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw { statusCode: 404, message: 'Tiffin payment not found' };
    if (payment.lifecycleState === PaymentLifecycleState.COMPLETED) return payment;
    if (payment.providerOrderId !== input.orderId || !razorpayClient.verifyCheckoutSignature(input.orderId, input.paymentId, input.signature)) {
      await prisma.tiffinPayment.updateMany({ where: { id: payment.id }, data: { status: TiffinPaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.VERIFICATION_FAILED } });
      throw { statusCode: 400, message: 'Razorpay payment signature is invalid' };
    }
    const gatewayPayment = await razorpayClient.fetchPayment(input.paymentId);
    if (gatewayPayment?.order_id !== input.orderId || gatewayPayment?.status !== 'captured' || Number(gatewayPayment.amount) !== Math.round(Number(payment.totalAmount) * 100)) {
      await prisma.tiffinPayment.updateMany({ where: { id: payment.id }, data: { status: TiffinPaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.VERIFICATION_FAILED } });
      throw { statusCode: 400, message: 'Razorpay payment could not be independently verified' };
    }
    return this.reconcileCapturedPayment(payment.id, input.paymentId, input.orderId);
  },

  async reconcileCapturedPayment(paymentId: string, gatewayPaymentId: string, gatewayOrderId: string, webhookEventId?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.tiffinPayment.findUnique({ where: { id: paymentId } });
      if (!payment) return null;
      if (payment.lifecycleState === PaymentLifecycleState.COMPLETED) return payment;
      const updated = await tx.tiffinPayment.updateMany({ where: { id: payment.id, lifecycleState: { in: [PaymentLifecycleState.ORDER_CREATED, PaymentLifecycleState.PROCESSING, PaymentLifecycleState.CAPTURED, PaymentLifecycleState.VERIFIED] } }, data: { status: TiffinPaymentStatus.PAID, lifecycleState: PaymentLifecycleState.COMPLETED, providerPaymentId: gatewayPaymentId, transactionId: gatewayPaymentId, verifiedAt: new Date(), paidAt: new Date(), ...(webhookEventId ? { lastWebhookEventId: webhookEventId } : {}) } });
      if (!updated.count) return tx.tiffinPayment.findUnique({ where: { id: payment.id } });
      await tx.tiffinCustomerSubscription.updateMany({ where: { id: payment.subscriptionId, status: TiffinSubscriptionStatus.PENDING }, data: { status: TiffinSubscriptionStatus.ACTIVE, paymentStatus: TiffinPaymentStatus.PAID, confirmedAt: new Date() } });
      const current = await tx.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
      await paymentAuditService.record({ eventType: 'PAYMENT_VERIFIED', tiffinPaymentId: payment.id, subscriptionId: payment.subscriptionId, gatewayOrderId, gatewayPaymentId, baseAmount: Number(current.baseAmount), platformFee: Number(current.platformFee), ownerAmount: Number(current.ownerAmount), studentPayable: Number(current.totalAmount), metadata: { subscriptionActivated: true } }, tx);
      return current;
    });
    return result;
  },

};
