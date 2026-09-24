// ─── Student Routes ─────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { studentController } from './student.controller.js';
import { authenticate } from '../../common/hooks/authenticate.js';
import type { UpdateStudentInput } from './student.schema.js';

export default async function studentRoutes(fastify: FastifyInstance) {
  fastify.post('/profile', studentController.createProfile);
  fastify.get('/profile', { preHandler: authenticate }, studentController.getProfile);
  fastify.put<{ Body: UpdateStudentInput }>('/profile', { preHandler: authenticate }, studentController.updateProfile);
}
