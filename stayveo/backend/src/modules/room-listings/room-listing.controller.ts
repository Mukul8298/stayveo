// ─── Room Listing Controller ──────────────────────────────────────────────
// Thin HTTP layer. Reads request → calls service → sends response.
// NO business logic. NO Prisma. Just HTTP plumbing.
// ─────────────────────────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { roomListingService } from './room-listing.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { CreateRoomListingInput, UpdateRoomListingInput } from './room-listing.schema.js';

function getPhone(request: FastifyRequest): string {
  const h = request.headers['x-provider-phone'];
  const phone = Array.isArray(h) ? h[0] : h;
  if (!phone) throw { statusCode: 400, message: 'x-provider-phone header is required' };
  return phone;
}

export const roomListingController = {
  /** POST /api/provider/room-listings */
  async create(
    request: FastifyRequest<{ Body: CreateRoomListingInput }>,
    reply: FastifyReply
  ) {
    const phone   = getPhone(request);
    const listing = await roomListingService.create(phone, request.body);
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
    return sendSuccess(reply, listing, listing.isActive ? 'Listing activated' : 'Listing closed');
  },

  /** DELETE /api/provider/room-listings/:id */
  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const phone = getPhone(request);
    await roomListingService.remove(phone, request.params.id);
    return sendSuccess(reply, null, 'Listing removed');
  },
};
