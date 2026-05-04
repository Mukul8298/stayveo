// ─── Student Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { studentController } from './student.controller.js';

export default async function studentRoutes(fastify: FastifyInstance) {
  fastify.post('/profile', studentController.createProfile);
  fastify.get('/profile', studentController.getProfile);
  fastify.put('/profile', studentController.updateProfile);
}
