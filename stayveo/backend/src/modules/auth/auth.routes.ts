// ─── Auth Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';
import { optionalAuthenticate } from '../../common/hooks/authenticate.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const otpRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  fastify.post('/start', otpRateLimit, authController.startAuth);
  fastify.post('/start-auth', otpRateLimit, authController.startAuth);
  fastify.post('/verify-otp', otpRateLimit, authController.verifyOtp);
  fastify.post('/resend-otp', otpRateLimit, authController.resendOtp);
  fastify.get('/me', { preHandler: optionalAuthenticate }, authController.me);
  fastify.post('/logout', authController.logout);
}
