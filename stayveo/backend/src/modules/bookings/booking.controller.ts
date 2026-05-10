// ─── Booking Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { bookingService } from './booking.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateBookingInput, BookingFilterInput } from './booking.schema.js';

export const bookingController = {
  /** POST /bookings — Create a booking */
  async create(
    request: FastifyRequest<{ Body: CreateBookingInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    if (!userId) return reply.status(401).send({ success: false, data: null, message: 'User ID required' });
    const booking = await bookingService.create(userId, request.body);
    return sendCreated(reply, booking, 'Booking created successfully');
  },

  /** GET /bookings/:id — Get booking details */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const booking = await bookingService.getById(request.params.id);
    return sendSuccess(reply, booking);
  },

  /** GET /bookings/provider/:providerId — List provider bookings */
  async listByProvider(
    request: FastifyRequest<{ Params: { providerId: string }; Querystring: BookingFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await bookingService.listByProvider(
      request.params.providerId,
      request.query as BookingFilterInput
    );
    return sendSuccess(reply, result);
  },

  /** GET /bookings/user — List current user's bookings */
  async listByUser(
    request: FastifyRequest<{ Querystring: BookingFilterInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    if (!userId) return reply.status(401).send({ success: false, data: null, message: 'User ID required' });
    const result = await bookingService.listByUser(userId, request.query as BookingFilterInput);
    return sendSuccess(reply, result);
  },

  /** PATCH /bookings/:id/status — Update booking status */
  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
    reply: FastifyReply
  ) {
    const booking = await bookingService.updateStatus(request.params.id, request.body);
    return sendSuccess(reply, booking, 'Booking status updated');
  },

  /** GET /bookings/stats/:providerId — Get dashboard stats */
  async getStats(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const stats = await bookingService.getProviderStats(request.params.providerId);
    return sendSuccess(reply, stats);
  },
};
