// ─── Auth Controller ────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/utils/response.js';
import type { SendOtpInput, VerifyOtpInput } from './auth.schema.js';

export const authController = {
  /** POST /auth/send-otp */
  async sendOtp(
    request: FastifyRequest<{ Body: SendOtpInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.sendOtp(request.body);
    return sendSuccess(reply, result, result.message);
  },

  /** POST /auth/verify-otp */
  async verifyOtp(
    request: FastifyRequest<{ Body: VerifyOtpInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.verifyOtp(request.body);
    return sendSuccess(reply, result, result.message);
  },
};
