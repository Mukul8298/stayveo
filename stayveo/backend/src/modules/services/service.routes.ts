// ─── Service Selection Routes ───────────────────────────────────────────
// Mounted under /provider/services

import { FastifyInstance } from 'fastify';
import { serviceController } from './service.controller.js';

export default async function serviceRoutes(fastify: FastifyInstance) {
  fastify.post('/', serviceController.addServices);
  fastify.get('/', serviceController.getServices);
}
