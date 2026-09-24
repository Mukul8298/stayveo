// ─── Booking Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { bookingController } from './booking.controller.js';
import { authenticateProvider, optionalAuthenticateProvider } from '../../common/hooks/authenticate-provider.js';

export default async function bookingRoutes(fastify: FastifyInstance) {
  const bookingRateLimit = { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } };
  fastify.post('/', bookingRateLimit, bookingController.create);
  fastify.get('/user', bookingController.listByUser);
  await fastify.register(async (sharedBookingRoutes) => {
    sharedBookingRoutes.addHook('preHandler', optionalAuthenticateProvider);
    sharedBookingRoutes.get('/:id/summary', bookingController.getSummary);
    sharedBookingRoutes.get('/:id', bookingController.getById);
  });
  await fastify.register(async (providerRoutes) => {
    providerRoutes.addHook('preHandler', authenticateProvider);
    providerRoutes.get('/provider/me', bookingController.listByCurrentProvider);
    providerRoutes.get('/provider/:providerId', bookingController.listByProvider);
    providerRoutes.get('/stats/:providerId', bookingController.getStats);
    providerRoutes.patch('/:id/status', bookingController.updateStatus);
  });
}
