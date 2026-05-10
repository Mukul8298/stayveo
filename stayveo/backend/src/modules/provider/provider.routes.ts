// ─── Provider Routes ────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { providerController } from './provider.controller.js';

export default async function providerRoutes(fastify: FastifyInstance) {
  fastify.post('/', providerController.create);
  fastify.get('/me', providerController.getMe);
}

export async function providerOnboardingRoutes(fastify: FastifyInstance) {
  fastify.post('/send-otp', providerController.sendOtp);
  fastify.post('/verify-otp', providerController.verifyOtp);
  fastify.post('/basic-info', providerController.saveBasicInfo);
  fastify.post('/services', providerController.saveServices);
  fastify.post('/service-details', providerController.saveServiceDetails);
  fastify.post('/photos', providerController.savePhotos);
  fastify.post('/verify-id', providerController.verifyIdentity);
}
