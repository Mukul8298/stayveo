// ─── Payment Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from './payment.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { CreatePaymentInput } from './payment.schema.js';
import { USER_ID_HEADER } from '../../common/constants.js';

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
