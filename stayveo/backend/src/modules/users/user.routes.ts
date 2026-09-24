// ─── User Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { userController } from './user.controller.js';
import { authenticate } from '../../common/hooks/authenticate.js';
import type { UpdateUserInput, UpdateUserProfileInput } from './user.schema.js';

export default async function userRoutes(fastify: FastifyInstance) {
  // Create a new user
  fastify.post('/', userController.create);

  // Get current user profile from the server-side session
  fastify.get('/me', { preHandler: authenticate }, userController.getMe);

  // Update current user
  fastify.put<{ Body: UpdateUserInput }>('/me', { preHandler: authenticate }, userController.updateMe);

  // Update the authenticated student's profile
  fastify.put<{ Body: UpdateUserProfileInput }>('/update-profile', { preHandler: authenticate }, userController.updateProfile);
}
