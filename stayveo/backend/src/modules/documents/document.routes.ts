// ─── Document Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { documentController } from './document.controller.js';

export default async function documentRoutes(fastify: FastifyInstance) {
  fastify.post('/', documentController.create);
  fastify.get('/:providerId', documentController.getByProvider);
}
