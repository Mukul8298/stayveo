// ─── Payment Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { paymentController } from './payment.controller.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post('/', paymentController.create);
  fastify.get('/provider/:providerId', paymentController.listByProvider);
  fastify.get('/earnings/:providerId', paymentController.getEarnings);
}
