// ─── Payment Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from './payment.service.js';
import { bookingService } from '../bookings/booking.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { CreatePaymentInput, VerifyPaymentInput } from './payment.schema.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import { paymentWebhookService } from './payment-webhook.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

export const paymentController = {
  /** POST /payments — Create a payment */
  async create(
    request: FastifyRequest<{ Body: CreatePaymentInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    if (!userId) return reply.status(401).send({ success: false, data: null, message: 'User ID required' });
    const payment = await paymentService.create(request.body, userId);
    return sendCreated(reply, payment, 'Payment recorded');
  },

  async verify(
    request: FastifyRequest<{ Body: VerifyPaymentInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    if (!userId) return reply.status(401).send({ success: false, data: null, message: 'User ID required' });
    const payment = await paymentService.verify(request.body, userId);
    return sendSuccess(reply, payment, 'Payment verified');
  },

  async razorpayWebhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = String(request.headers['x-razorpay-signature'] || '');
    const result = await paymentWebhookService.handleRazorpay(request.rawBody || JSON.stringify(request.body || {}), signature);
    return sendSuccess(reply, result, 'Webhook received');
  },

  /** GET /payments/provider/:providerId — List provider payments */
  async listByProvider(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const providerUserId = request.providerAuth?.userId;
    if (!providerUserId) return reply.status(401).send({ success: false, data: null, message: 'Provider authentication required' });
    const providerIds = await bookingService.resolveProviderIdsByUserId(providerUserId);
    if (!providerIds.includes(request.params.providerId)) {
      return reply.status(403).send({ success: false, data: null, message: 'You do not own this provider account' });
    }
    const payments = await paymentService.listByProvider(request.params.providerId);
    return sendSuccess(reply, payments);
  },

  /** GET /payments/earnings/:providerId — Get earnings summary */
  async getEarnings(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const providerUserId = request.providerAuth?.userId;
    if (!providerUserId) return reply.status(401).send({ success: false, data: null, message: 'Provider authentication required' });
    const providerIds = await bookingService.resolveProviderIdsByUserId(providerUserId);
    if (!providerIds.includes(request.params.providerId)) {
      return reply.status(403).send({ success: false, data: null, message: 'You do not own this provider account' });
    }
    const earnings = await paymentService.getEarnings(request.params.providerId);
    return sendSuccess(reply, earnings);
  },
};
