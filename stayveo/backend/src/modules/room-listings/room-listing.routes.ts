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
import { roomListingController } from './room-listing.controller.js';

export default async function roomListingRoutes(fastify: FastifyInstance) {
  fastify.post('/',                roomListingController.create);
  fastify.get('/',                 roomListingController.list);
  fastify.get('/:id',              roomListingController.getOne);
  fastify.put('/:id',              roomListingController.update);
  fastify.patch('/:id/toggle',     roomListingController.toggle);
  fastify.delete('/:id',           roomListingController.remove);
}
