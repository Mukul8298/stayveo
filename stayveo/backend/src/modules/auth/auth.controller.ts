// ─── Auth Controller ────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/utils/response.js';
import type { StartAuthInput, VerifyOtpInput, ResendOtpInput } from './auth.schema.js';

export const authController = {
  /** POST /auth/start-auth */
  async startAuth(
    request: FastifyRequest<{ Body: StartAuthInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.startAuth(request.body);
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

  /** POST /auth/resend-otp */
  async resendOtp(
    request: FastifyRequest<{ Body: ResendOtpInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.resendOtp(request.body);
    return sendSuccess(reply, result, result.message);
  },
};
