// ─── Tiffin Controller ──────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { tiffinService } from './tiffin.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateTiffinInput, TiffinFilterInput } from './tiffin.schema.js';
import { tiffinReservationService } from './tiffin-reservation.service.js';
import { tiffinStudentService } from './tiffin-student.service.js';
import { invalidateProviderDashboardCache, tiffinProviderDashboardKey } from '../../common/cache/provider-dashboard.js';

function userId(request: FastifyRequest) {
  return request.headers[USER_ID_HEADER] as string;
}

async function invalidateTiffinDashboard(request: FastifyRequest, subscriptionId?: string) {
  if (!subscriptionId) return;
  try {
    const subscription = await request.server.prisma.tiffinCustomerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { kitchen: { select: { ownerId: true } } },
    });
    if (subscription?.kitchen.ownerId) {
      await invalidateProviderDashboardCache(
        request.server.redis,
        tiffinProviderDashboardKey(subscription.kitchen.ownerId),
        request.server.log
      );
    }
  } catch (error) {
    request.server.log.warn({ err: error }, 'Tiffin provider dashboard cache invalidation failed');
  }
}

export const tiffinController = {
  /** POST /tiffin */
  async create(
    request: FastifyRequest<{ Body: CreateTiffinInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const tiffin = await tiffinService.create(userId, request.body);
    return sendCreated(reply, tiffin, 'Tiffin service created successfully');
  },

  /** GET /tiffin */
  async list(
    request: FastifyRequest<{ Querystring: TiffinFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await tiffinService.list(request.query as TiffinFilterInput);
    return sendSuccess(reply, result);
  },

  /** GET /tiffin/:id/menu/today */
  async todayMenu(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await tiffinService.getTodayMenu(request.params.id);
    return sendSuccess(reply, result || { serviceId: request.params.id, dayOfWeek: null, meals: { lunch: [], dinner: [] } });
  },

  /** GET /tiffin/:id/reservation — reservation context */
  async reservationContext(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { planId?: string; plan?: string } }>,
    reply: FastifyReply
  ) {
    return sendSuccess(reply, await tiffinReservationService.getContext(request.params.id, userId(request), request.query?.planId, request.query?.plan));
  },

  /** POST /tiffin/:id/reservation — create a pending reservation */
  async createReservation(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const reservation = await tiffinReservationService.create(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, reservation.id);
    return sendCreated(reply, reservation, 'Reservation created and awaiting payment');
  },

  /** POST /tiffin/reservations/:id/confirm — payment adapter confirmation */
  async confirmReservation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.confirm(request.params.id, userId(request));
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Reservation confirmed');
  },

  async failReservationPayment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.failPayment(request.params.id, userId(request));
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Mock payment marked failed');
  },

  async getReservation(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { serviceId?: string } }>,
    reply: FastifyReply
  ) {
    return sendSuccess(reply, await tiffinReservationService.get(request.params.id, userId(request), request.query?.serviceId));
  },

  async getPayment(
    request: FastifyRequest<{ Params: { id: string; paymentId: string } }>,
    reply: FastifyReply
  ) {
    return sendSuccess(reply, await tiffinReservationService.getPayment(request.params.id, request.params.paymentId, userId(request)));
  },

  async createPayment(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.createPayment(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Payment attempt ready');
  },

  async processMockPayment(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.processPayment(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Mock payment is processing');
  },

  async completeMockPayment(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.completePayment(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Mock payment verified and reservation updated');
  },

  async failMockPayment(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.failPayment(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Mock payment marked failed');
  },

  async cancelMockPayment(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const result = await tiffinReservationService.cancelPayment(request.params.id, userId(request), request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Mock payment cancelled');
  },

  async myReservations(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(reply, await tiffinReservationService.listMine(userId(request)));
  },

  async mySpace(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(reply, await tiffinStudentService.getMySpace(userId(request)));
  },

  async skipMeal(
    request: FastifyRequest<{ Params: { id: string }; Body: { meal?: string; date?: string } }>,
    reply: FastifyReply
  ) {
    const result = await tiffinStudentService.skipMeal(userId(request), request.params.id, request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Meal skipped');
  },

  async pauseSubscription(
    request: FastifyRequest<{ Params: { id: string }; Body: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
  ) {
    const result = await tiffinStudentService.pauseSubscription(userId(request), request.params.id, request.body || {});
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Subscription paused');
  },

  async resumeSubscription(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await tiffinStudentService.resumeSubscription(userId(request), request.params.id);
    await invalidateTiffinDashboard(request, request.params.id);
    return sendSuccess(reply, result, 'Subscription resumed');
  },
};
