// ─── Student Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { studentService } from './student.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';

export const studentController = {
  /** POST /student/profile */
  async createProfile(
    request: FastifyRequest<{ Body: CreateStudentInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const profile = await studentService.createProfile(userId, request.body);
    return sendCreated(reply, profile, 'Student profile created');
  },

  /** GET /student/profile */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const profile = await studentService.getProfile(userId);
    return sendSuccess(reply, profile);
  },

  /** PUT /student/profile */
  async updateProfile(
    request: FastifyRequest<{ Body: UpdateStudentInput }>,
    reply: FastifyReply
  ) {
    console.log('Incoming Body:', request.body);
    const userId = request.headers[USER_ID_HEADER] as string;
    const profile = await studentService.updateProfile(userId, request.body);
    return sendSuccess(reply, profile, 'Student profile updated');
  },
};
