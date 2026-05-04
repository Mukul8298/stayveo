// ─── PG Routes ──────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { pgController } from './pg.controller.js';

export default async function pgRoutes(fastify: FastifyInstance) {
  fastify.post('/', pgController.create);
  fastify.get('/', pgController.list);
  fastify.get('/:id', pgController.getById);
}
