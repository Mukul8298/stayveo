// ─── Provider Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { providerController } from './provider.controller.js';

export default async function providerRoutes(fastify: FastifyInstance) {
  fastify.post('/', providerController.create);
  fastify.get('/me', providerController.getMe);
}
