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
import { Prisma } from '@prisma/client';

function isPrismaRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

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

    let result;
    try {
      result = await studentService.createProfile(setup.userId, request.body, request.server.redis);
    } catch (error) {
      if (!request.body.phone || !isPrismaRequestError(error)) throw error;
      request.log.error({ err: error, userId: setup.userId }, 'Unable to save student phone number');
      if (error.code === 'P2002') return reply.status(409).send({ success: false, data: null, message: 'Phone number is already registered' });
      return reply.status(500).send({ success: false, data: null, message: 'Unable to save phone number. Please try again.' });
    }
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
    let profile;
    try {
      profile = await studentService.updateProfile(userId, request.body);
    } catch (error) {
      if (!request.body.phone || !isPrismaRequestError(error)) throw error;
      request.log.error({ err: error, userId }, 'Unable to update student phone number');
      if (error.code === 'P2002') return reply.status(409).send({ success: false, data: null, message: 'Phone number is already registered' });
      return reply.status(500).send({ success: false, data: null, message: 'Unable to save phone number. Please try again.' });
    }
    return sendSuccess(reply, profile, 'Student profile updated');
  },
};
