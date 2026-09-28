// ─── Payment Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';
import { paymentController } from './payment.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const paymentCreationRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  const paymentVerificationRateLimit = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } };
  const captureRawBody = async (_request: any, _reply: any, payload: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of payload) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    _request.rawBody = Buffer.concat(chunks).toString('utf8');
    return Readable.from(Buffer.concat(chunks));
  };

  fastify.post('/webhooks/razorpay', { preParsing: captureRawBody }, paymentController.razorpayWebhook);
  fastify.post('/', paymentCreationRateLimit, paymentController.create);
  fastify.post('/:paymentId/verify', paymentVerificationRateLimit, paymentController.verify);
  await fastify.register(async (providerRoutes) => {
    providerRoutes.addHook('preHandler', authenticateProvider);
    providerRoutes.get('/provider/:providerId', paymentController.listByProvider);
    providerRoutes.get('/earnings/:providerId', paymentController.getEarnings);
  });
}
