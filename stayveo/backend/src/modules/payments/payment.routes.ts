// ─── Payment Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { paymentController } from './payment.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const paymentRateLimit = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } };
  fastify.post('/', paymentRateLimit, paymentController.create);
  await fastify.register(async (providerRoutes) => {
    providerRoutes.addHook('preHandler', authenticateProvider);
    providerRoutes.get('/provider/:providerId', paymentController.listByProvider);
    providerRoutes.get('/earnings/:providerId', paymentController.getEarnings);
  });
}
