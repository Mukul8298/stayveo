// ─── Laundry Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { laundryController } from './laundry.controller.js';

export default async function laundryRoutes(fastify: FastifyInstance) {
  fastify.post('/', laundryController.create);
  fastify.get('/', laundryController.list);
}
