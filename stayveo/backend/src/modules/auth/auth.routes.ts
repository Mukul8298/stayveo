// ─── Auth Routes ────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/send-otp', authController.sendOtp);
  fastify.post('/verify-otp', authController.verifyOtp);
}
