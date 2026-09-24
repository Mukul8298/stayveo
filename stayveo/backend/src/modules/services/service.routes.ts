// ─── Service Selection Routes ───────────────────────────────────────────
// Mounted under /provider/services

import { FastifyInstance } from 'fastify';
import { serviceController } from './service.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';

export default async function serviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateProvider);
  fastify.post('/', serviceController.addServices);
  fastify.get('/', serviceController.getServices);
}
