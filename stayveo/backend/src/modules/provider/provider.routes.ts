// ─── Provider Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { providerController } from './provider.controller.js';

export default async function providerRoutes(fastify: FastifyInstance) {
  fastify.post('/', providerController.create);
  fastify.get('/me', providerController.getMe);
}

export async function providerOnboardingRoutes(fastify: FastifyInstance) {
  // ── OTP auth ──────────────────────────────────────────────────────────
  fastify.post('/send-otp', providerController.sendOtp);
  fastify.post('/verify-otp', providerController.verifyOtp);
  fastify.post('/resend-otp', providerController.resendOtp);

  // ── Onboarding flow ───────────────────────────────────────────────────
  fastify.post('/basic-info', providerController.saveBasicInfo);
  fastify.post('/services', providerController.saveServices);
  fastify.post('/service-details', providerController.saveServiceDetails);
  fastify.post('/photos', providerController.savePhotos);
  fastify.post('/verify-id', providerController.verifyIdentity);

  // ── Profile dashboard ─────────────────────────────────────────────────
  // GET  /api/provider/dashboard-stats   → 3 aggregated numbers for profile card
  // GET  /api/provider/business-details  → prefill edit form
  // PUT  /api/provider/business-details  → save changes from edit form
  fastify.get('/dashboard-stats', providerController.getDashboardStats);
  fastify.get('/business-details', providerController.getBusinessDetails);
  fastify.put('/business-details', providerController.updateBusinessDetails);
}
