// ─── Visit Controller ───────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { visitService } from './visit.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateVisitInput } from './visit.schema.js';

export const visitController = {
  /** POST /visits — Create a visit request */
  async create(
    request: FastifyRequest<{ Body: CreateVisitInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    if (!userId) return reply.status(401).send({ success: false, data: null, message: 'User ID required' });
    const visit = await visitService.create(userId, request.body);
    return sendCreated(reply, visit, 'Visit request created');
  },

  /** GET /visits/:id — Get visit details */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const visit = await visitService.getById(request.params.id);
    return sendSuccess(reply, visit);
  },

  /** GET /visits/provider/:providerId — List provider's visit requests */
  async listByProvider(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const visits = await visitService.listByProvider(request.params.providerId);
    return sendSuccess(reply, visits);
  },

  /** GET /visits/booking/:bookingId — List visits for a booking */
  async listByBooking(
    request: FastifyRequest<{ Params: { bookingId: string } }>,
    reply: FastifyReply
  ) {
    const visits = await visitService.listByBooking(request.params.bookingId);
    return sendSuccess(reply, visits);
  },

  /** PATCH /visits/:id/status — Update visit status */
  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
    reply: FastifyReply
  ) {
    const visit = await visitService.updateStatus(request.params.id, request.body);
    return sendSuccess(reply, visit, 'Visit status updated');
  },
};
