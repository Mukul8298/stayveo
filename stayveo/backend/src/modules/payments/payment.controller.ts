// ─── Payment Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from './payment.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { CreatePaymentInput } from './payment.schema.js';

export const paymentController = {
  /** POST /payments — Create a payment */
  async create(
    request: FastifyRequest<{ Body: CreatePaymentInput }>,
    reply: FastifyReply
  ) {
    const payment = await paymentService.create(request.body);
    return sendCreated(reply, payment, 'Payment recorded');
  },

  /** GET /payments/provider/:providerId — List provider payments */
  async listByProvider(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const payments = await paymentService.listByProvider(request.params.providerId);
    return sendSuccess(reply, payments);
  },

  /** GET /payments/earnings/:providerId — Get earnings summary */
  async getEarnings(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const earnings = await paymentService.getEarnings(request.params.providerId);
    return sendSuccess(reply, earnings);
  },
};
