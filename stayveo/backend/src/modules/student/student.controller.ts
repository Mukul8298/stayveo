// ─── Student Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { studentService } from './student.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import {
  clearProfileSetupCookie,
  PROFILE_SETUP_COOKIE_NAME,
  readProfileSetupToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../../common/auth/session.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';

export const studentController = {
  /** POST /student/profile */
  async createProfile(
    request: FastifyRequest<{ Body: CreateStudentInput }>,
    reply: FastifyReply
  ) {
    const setupToken = request.cookies[PROFILE_SETUP_COOKIE_NAME];
    const setup = setupToken ? readProfileSetupToken(setupToken) : null;
    if (!setup || setup.role !== 'STUDENT') {
      return reply.status(401).send({
        success: false,
        data: null,
        message: 'Profile setup authorization is missing or expired',
      });
    }

    const result = await studentService.createProfile(setup.userId, request.body, request.server.redis);
    reply.setCookie(SESSION_COOKIE_NAME, result.sessionId, sessionCookieOptions());
    clearProfileSetupCookie(reply);
    return sendCreated(reply, result.profile, 'Student profile created');
  },

  /** GET /student/profile */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const profile = await studentService.getProfile(userId);
    return sendSuccess(reply, profile);
  },

  /** PUT /student/profile */
  async updateProfile(
    request: FastifyRequest<{ Body: UpdateStudentInput }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.id;
    const profile = await studentService.updateProfile(userId, request.body);
    return sendSuccess(reply, profile, 'Student profile updated');
  },
};
