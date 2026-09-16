// ─── Payment Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { paymentController } from './payment.controller.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const paymentRateLimit = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } };
  fastify.post('/', paymentRateLimit, paymentController.create);
  fastify.get('/provider/:providerId', paymentController.listByProvider);
  fastify.get('/earnings/:providerId', paymentController.getEarnings);
}
