// ─── Auth Controller ────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/utils/response.js';
import type { StartAuthInput, VerifyOtpInput, ResendOtpInput } from './auth.schema.js';
import {
  clearSessionCookie,
  clearProfileSetupCookie,
  deleteSession,
  PROFILE_SETUP_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  profileSetupCookieOptions,
  sessionCookieOptions,
} from '../../common/auth/session.js';

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
    const result = await authService.verifyOtp(request.body, request.server.redis);
    const { sessionId, profileSetupToken, ...publicResult } = result;

    if (sessionId) {
      clearProfileSetupCookie(reply);
      reply.setCookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
    }
    if (profileSetupToken) {
      reply.setCookie(PROFILE_SETUP_COOKIE_NAME, profileSetupToken, profileSetupCookieOptions());
    }

    return sendSuccess(reply, publicResult, publicResult.message);
  },

  /** GET /auth/me */
  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return sendSuccess(reply, { authenticated: false }, 'Not authenticated');
    }

    const result = await authService.getCurrentUser(request.user.id);
    return sendSuccess(reply, result, 'Authenticated');
  },

  /** POST /auth/logout */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await deleteSession(request.server.redis, sessionId, request.session?.userId);
    }
    clearSessionCookie(reply);
    return sendSuccess(reply, { authenticated: false }, 'Logged out');
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
