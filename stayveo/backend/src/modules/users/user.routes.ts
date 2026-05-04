// ─── User Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { userController } from './user.controller.js';

export default async function userRoutes(fastify: FastifyInstance) {
  // Create a new user
  fastify.post('/', userController.create);

  // Get current user profile (via x-user-id header)
  fastify.get('/me', userController.getMe);

  // Update current user
  fastify.put('/me', userController.updateMe);

  // Update a student profile via phone lookup
  fastify.put('/update-profile', userController.updateProfile);
}
