// ─── Cleaning Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { cleaningController } from './cleaning.controller.js';

export default async function cleaningRoutes(fastify: FastifyInstance) {
  fastify.post('/', cleaningController.create);
  fastify.get('/', cleaningController.list);
}
