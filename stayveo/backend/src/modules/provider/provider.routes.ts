// ─── Provider Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { providerController } from './provider.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';
import { providerBankDetailsController } from '../provider-bank-details/bank-details.controller.js';

export default async function providerRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateProvider);
  fastify.post('/', providerController.create);
  fastify.get('/me', providerController.getMe);
  fastify.get('/dashboard', providerController.getDashboard);
}

export async function providerOnboardingRoutes(fastify: FastifyInstance) {
  // ── OTP auth ──────────────────────────────────────────────────────────
  fastify.post('/send-otp', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, providerController.sendOtp);
  fastify.post('/verify-otp', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, providerController.verifyOtp);
  fastify.post('/resend-otp', { config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } }, providerController.resendOtp);

  await fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', authenticateProvider);
    // ── Onboarding flow ─────────────────────────────────────────────────
    protectedRoutes.post('/select-type', providerController.selectType);
    protectedRoutes.post('/pg-onboarding', providerController.savePgOnboarding);
    protectedRoutes.post('/complete-onboarding', providerController.completeOnboarding);
    protectedRoutes.post('/basic-info', providerController.saveBasicInfo);
    protectedRoutes.post('/services', providerController.saveServices);
    protectedRoutes.post('/service-details', providerController.saveServiceDetails);
    protectedRoutes.post('/photos', providerController.savePhotos);
    protectedRoutes.post('/verify-id', providerController.verifyIdentity);

    // ── Profile dashboard ───────────────────────────────────────────────
    protectedRoutes.get('/dashboard-stats', providerController.getDashboardStats);
    protectedRoutes.get('/business-details', providerController.getBusinessDetails);
    protectedRoutes.put('/business-details', providerController.updateBusinessDetails);
    protectedRoutes.get('/bank-details', providerBankDetailsController.get);
    protectedRoutes.put('/bank-details', providerBankDetailsController.upsert);
  });
  fastify.post('/logout', providerController.logout);
}
