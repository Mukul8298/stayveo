// ─── Profile View Routes ────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { profileViewController } from './profile-view.controller.js';

export default async function profileViewRoutes(fastify: FastifyInstance) {
  fastify.post('/:providerId', profileViewController.record);
  fastify.get('/:providerId/count', profileViewController.getCount);
}
