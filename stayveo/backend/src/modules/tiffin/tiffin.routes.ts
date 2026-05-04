// ─── Tiffin Routes ──────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { tiffinController } from './tiffin.controller.js';

export default async function tiffinRoutes(fastify: FastifyInstance) {
  fastify.post('/', tiffinController.create);
  fastify.get('/', tiffinController.list);
}
