// ─── Media Routes ───────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { mediaController } from './media.controller.js';

export default async function mediaRoutes(fastify: FastifyInstance) {
  fastify.post('/upload', mediaController.upload);
  fastify.get('/:providerId', mediaController.getByProvider);
}
