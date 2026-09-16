// ─── Auth Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const otpRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  fastify.post('/start', otpRateLimit, authController.startAuth);
  fastify.post('/start-auth', otpRateLimit, authController.startAuth);
  fastify.post('/verify-otp', otpRateLimit, authController.verifyOtp);
  fastify.post('/resend-otp', otpRateLimit, authController.resendOtp);
}
