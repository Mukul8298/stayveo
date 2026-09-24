// ─── Room Listing Controller ──────────────────────────────────────────────
// Thin HTTP layer. Reads request → calls service → sends response.
// NO business logic. NO Prisma. Just HTTP plumbing.
// ─────────────────────────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { roomListingService } from './room-listing.service.js';
import { roomListingRepository } from './room-listing.repository.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { CreateRoomListingInput, UpdateRoomListingInput } from './room-listing.schema.js';
import { invalidateProviderDashboardCache, pgProviderDashboardKey } from '../../common/cache/provider-dashboard.js';

function getPhone(request: FastifyRequest): string {
  const phone = request.providerAuth?.phone;
  if (!phone) throw { statusCode: 401, message: 'Provider authentication required' };
  return phone;
}

async function invalidateDashboard(request: FastifyRequest) {
  const providerId = request.providerAuth?.profileId;
  if (!providerId) return;
  await invalidateProviderDashboardCache(request.server.redis, pgProviderDashboardKey(providerId), request.server.log);
}

export const roomListingController = {
  /** POST /api/provider/room-listings */
  async create(
    request: FastifyRequest<{ Body: CreateRoomListingInput }>,
    reply: FastifyReply
  ) {
    const phone   = getPhone(request);
    const listing = await roomListingService.create(phone, request.body);
    await invalidateDashboard(request);
    return sendCreated(reply, listing, 'Room listing created');
  },

  /** GET /api/provider/room-listings */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const phone    = getPhone(request);
    const listings = await roomListingService.listForProvider(phone);
    return sendSuccess(reply, listings);
  },

  /** GET /api/provider/room-listings/:id */
  async getOne(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const phone   = getPhone(request);
    const listing = await roomListingService.getOne(phone, request.params.id);
    return sendSuccess(reply, listing);
  },

  /** PUT /api/provider/room-listings/:id */
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoomListingInput }>,
    reply: FastifyReply
  ) {
    const phone   = getPhone(request);
    const listing = await roomListingService.update(phone, request.params.id, request.body);
    await invalidateDashboard(request);
    return sendSuccess(reply, listing, 'Listing updated');
  },

  /**
   * PATCH /api/provider/room-listings/:id/toggle
   * Body: { isActive: boolean }
   */
  async toggle(
    request: FastifyRequest<{ Params: { id: string }; Body: { isActive: boolean } }>,
    reply: FastifyReply
  ) {
    const phone   = getPhone(request);
    const listing = await roomListingService.toggle(phone, request.params.id, request.body.isActive);
    await invalidateDashboard(request);
    return sendSuccess(reply, listing, listing.isActive ? 'Listing activated' : 'Listing closed');
  },

  /** DELETE /api/provider/room-listings/:id */
  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const phone = getPhone(request);
    await roomListingService.remove(phone, request.params.id);
    await invalidateDashboard(request);
    return sendSuccess(reply, null, 'Listing removed');
  },

  async adjustInventory(
    request: FastifyRequest<{ Params: { id: string }; Body: { delta: number } }>,
    reply: FastifyReply
  ) {
    const phone = getPhone(request);
    const delta = Number(request.body?.delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100) {
      throw { statusCode: 400, message: 'Inventory delta must be a non-zero integer between -100 and 100' };
    }
    const listing = await roomListingService.adjustInventory(phone, request.params.id, delta);
    await invalidateDashboard(request);
    return sendSuccess(reply, listing, delta > 0 ? 'Beds added' : 'Beds removed');
  },
};

export const publicRoomListingController = {
  async list(_request: FastifyRequest, reply: FastifyReply) {
    // Availability changes after reservations and provider inventory updates.
    // Do not let a browser/CDN serve an old availableBeds value.
    reply.header('Cache-Control', 'no-store');
    const listings = await roomListingRepository.findActiveForStudents();
    return sendSuccess(reply, listings);
  },
};
