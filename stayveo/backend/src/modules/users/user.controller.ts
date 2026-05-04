// ─── User Controller ────────────────────────────────────────────────────
// Request handlers for user endpoints
// ────────────────────────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './user.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateUserInput, UpdateUserInput, UpdateUserProfileInput } from './user.schema.js';

export const userController = {
  /** POST /users — Create a new user */
  async create(request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) {
    const user = await userService.create(request.body);
    return sendCreated(reply, user, 'User created successfully');
  },

  /** GET /users/me — Get current user profile */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const user = await userService.getWithProfile(userId);
    return sendSuccess(reply, user);
  },

  /** PUT /users/me — Update current user */
  async updateMe(request: FastifyRequest<{ Body: UpdateUserInput }>, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const user = await userService.update(userId, request.body);
    return sendSuccess(reply, user, 'User updated successfully');
  },

  /** PUT /user/update-profile — Update a student profile by phone */
  async updateProfile(
    request: FastifyRequest<{ Body: UpdateUserProfileInput }>,
    reply: FastifyReply
  ) {
    console.log('Incoming Body:', request.body);
    const user = await userService.updateProfile(request.body);
    return sendSuccess(reply, user, 'Profile updated successfully');
  },
};
