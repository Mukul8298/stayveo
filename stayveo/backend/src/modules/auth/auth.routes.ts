// ─── Auth Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/start', authController.startAuth);
  fastify.post('/start-auth', authController.startAuth);
  fastify.post('/verify-otp', authController.verifyOtp);
  fastify.post('/resend-otp', authController.resendOtp);
}
