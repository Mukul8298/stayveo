// ─── Room Listing Routes ──────────────────────────────────────────────────
// Mounted under /api/provider/room-listings in app.ts
//
// REST API design:
//   POST   /               → create new listing
//   GET    /               → list all provider's listings
//   GET    /:id            → get single listing
//   PUT    /:id            → full update (send all editable fields)
//   PATCH  /:id/toggle     → change only isActive (toggle visibility)
//   DELETE /:id            → soft delete (marks as CLOSED)
// ─────────────────────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { roomListingController, publicRoomListingController } from './room-listing.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';

export async function publicRoomListingRoutes(fastify: FastifyInstance) {
  fastify.get('/public', publicRoomListingController.list);
}

export default async function roomListingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateProvider);
  fastify.post('/',                roomListingController.create);
  fastify.get('/',                 roomListingController.list);
  fastify.get('/:id',              roomListingController.getOne);
  fastify.put('/:id',              roomListingController.update);
  fastify.patch('/:id/toggle',     roomListingController.toggle);
  fastify.patch('/:id/inventory',  roomListingController.adjustInventory);
  fastify.delete('/:id',           roomListingController.remove);
}
