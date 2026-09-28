import { PaymentLifecycleState, PaymentStatus, TiffinPaymentStatus } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import { paymentAuditService } from './payment-audit.service.js';
import { paymentService } from './payment.service.js';
import { razorpayClient } from './razorpay.client.js';
import { tiffinPaymentService } from '../tiffin/tiffin-payment.service.js';

function eventPayload(payload: any) {
  return payload?.payload?.payment?.entity
    || payload?.payload?.refund?.entity
    || payload?.payment?.entity
    || payload?.refund?.entity
    || null;
}

function gatewayWhere(paymentId: string | null, orderId: string | null) {
  return [
    paymentId ? { providerPaymentId: paymentId } : null,
    orderId ? { providerOrderId: orderId } : null,
  ].filter(Boolean) as Array<{ providerPaymentId?: string; providerOrderId?: string }>;
}

export const paymentWebhookService = {
  async handleRazorpay(rawBody: string, signature: string) {
    if (!razorpayClient.verifyWebhookSignature(rawBody, signature)) {
      throw { statusCode: 400, message: 'Invalid Razorpay webhook signature' };
    }
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw { statusCode: 400, message: 'Invalid Razorpay webhook payload' };
    }

    const eventId = String(payload?.id || '').trim();
    const eventType = String(payload?.event || '').trim();
    if (!eventId || !eventType) throw { statusCode: 400, message: 'Razorpay webhook event is incomplete' };

    let event = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
    if (event?.status === 'PROCESSED') return { duplicate: true, eventId };
    if (!event) {
      try {
        event = await prisma.paymentWebhookEvent.create({
          data: { provider: 'RAZORPAY', eventId, eventType, signatureVerified: true, status: 'RECEIVED', payload },
        });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
        event = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
      }
    }
    if (!event) throw { statusCode: 500, message: 'Webhook event could not be persisted' };

    try {
      const entity = eventPayload(payload);
      const orderId = entity?.order_id || entity?.notes?.orderId || null;
      const paymentId = entity?.id || null;
      const gatewayMatch = gatewayWhere(paymentId, orderId);

      if (eventType === 'payment.captured') {
        const pgPayment = gatewayMatch.length ? await prisma.payment.findFirst({ where: { OR: gatewayMatch } }) : null;
        if (pgPayment) await paymentService.reconcileCapturedPayment(pgPayment.id, paymentId, orderId || pgPayment.providerOrderId || '', eventId);

        const tiffinPayment = gatewayMatch.length ? await prisma.tiffinPayment.findFirst({ where: { OR: gatewayMatch } }) : null;
        if (tiffinPayment) await tiffinPaymentService.reconcileCapturedPayment(tiffinPayment.id, paymentId, orderId || tiffinPayment.providerOrderId || '', eventId);
      } else if (eventType === 'payment.failed') {
        const pgPayment = gatewayMatch.length ? await prisma.payment.findFirst({ where: { OR: gatewayMatch } }) : null;
        if (pgPayment) {
          await prisma.payment.updateMany({ where: { id: pgPayment.id, lifecycleState: { notIn: [PaymentLifecycleState.COMPLETED, PaymentLifecycleState.REFUNDED] } }, data: { status: PaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.PAYMENT_FAILED, lastWebhookEventId: eventId } });
          await paymentAuditService.record({ eventType: 'PAYMENT_FAILED', paymentId: pgPayment.id, gatewayOrderId: orderId || undefined, gatewayPaymentId: paymentId || undefined, metadata: { source: 'RAZORPAY_WEBHOOK', eventId } });
        }
        const tiffinPayment = gatewayMatch.length ? await prisma.tiffinPayment.findFirst({ where: { OR: gatewayMatch } }) : null;
        if (tiffinPayment) {
          await prisma.tiffinPayment.updateMany({ where: { id: tiffinPayment.id, lifecycleState: { notIn: [PaymentLifecycleState.COMPLETED, PaymentLifecycleState.REFUNDED] } }, data: { status: TiffinPaymentStatus.FAILED, lifecycleState: PaymentLifecycleState.PAYMENT_FAILED, lastWebhookEventId: eventId } });
          await paymentAuditService.record({ eventType: 'PAYMENT_FAILED', tiffinPaymentId: tiffinPayment.id, gatewayOrderId: orderId || undefined, gatewayPaymentId: paymentId || undefined, metadata: { source: 'RAZORPAY_WEBHOOK', eventId } });
        }
      }

      await prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
      return { duplicate: false, eventId, eventType };
    } catch (error: any) {
      await prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { status: 'FAILED', errorMessage: String(error?.message || error).slice(0, 500) } });
      throw error;
    }
  },
};
