// ─── Visit Routes ───────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { visitController } from './visit.controller.js';

export default async function visitRoutes(fastify: FastifyInstance) {
  fastify.post('/', visitController.create);
  fastify.get('/provider/:providerId', visitController.listByProvider);
  fastify.get('/booking/:bookingId', visitController.listByBooking);
  fastify.get('/:id', visitController.getById);
  fastify.patch('/:id/status', visitController.updateStatus);
}
