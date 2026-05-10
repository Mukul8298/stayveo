// ─── Booking Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { bookingController } from './booking.controller.js';

export default async function bookingRoutes(fastify: FastifyInstance) {
  fastify.post('/', bookingController.create);
  fastify.get('/user', bookingController.listByUser);
  fastify.get('/provider/:providerId', bookingController.listByProvider);
  fastify.get('/stats/:providerId', bookingController.getStats);
  fastify.get('/:id', bookingController.getById);
  fastify.patch('/:id/status', bookingController.updateStatus);
}
