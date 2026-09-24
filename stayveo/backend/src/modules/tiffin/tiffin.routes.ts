// ─── Tiffin Routes ──────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { tiffinController } from './tiffin.controller.js';
import { tiffinProviderController } from './tiffin-provider.controller.js';
import { authenticateProvider } from '../../common/hooks/authenticate-provider.js';

export default async function tiffinRoutes(fastify: FastifyInstance) {
  fastify.post('/', tiffinController.create);
  fastify.get('/', tiffinController.list);
  fastify.get('/:id/menu/today', tiffinController.todayMenu);
  fastify.get('/my-space', tiffinController.mySpace);
  fastify.get('/my-reservations', tiffinController.myReservations);
  fastify.post('/my-subscriptions/:id/skip-meal', tiffinController.skipMeal);
  fastify.post('/my-subscriptions/:id/pause', tiffinController.pauseSubscription);
  fastify.post('/my-subscriptions/:id/resume', tiffinController.resumeSubscription);
  fastify.get('/:id/reservation', tiffinController.reservationContext);
  fastify.post('/:id/reservation', tiffinController.createReservation);
  fastify.get('/reservations/:id', tiffinController.getReservation);
  fastify.get('/:id/payment/:paymentId', tiffinController.getPayment);
  fastify.post('/reservations/:id/payment', tiffinController.createPayment);
  fastify.post('/reservations/:id/payment/mock/process', tiffinController.processMockPayment);
  fastify.post('/reservations/:id/payment/mock/complete', tiffinController.completeMockPayment);
  fastify.post('/reservations/:id/payment/mock/fail', tiffinController.failMockPayment);
  fastify.post('/reservations/:id/payment/mock/cancel', tiffinController.cancelMockPayment);
  fastify.post('/reservations/:id/payment/fail', tiffinController.failReservationPayment);
  fastify.post('/reservations/:id/confirm', tiffinController.confirmReservation);

  // Provider onboarding is authenticated with the email-login session. The
  // controller derives ownership from request.user and does not trust IDs or
  // phone headers supplied by the browser.
  await fastify.register(async (providerRoutes) => {
    providerRoutes.addHook('preHandler', authenticateProvider);
    providerRoutes.get('/provider/onboarding', tiffinProviderController.getOnboarding);
    providerRoutes.put<{ Body: { step?: string; data?: Record<string, unknown> } }>('/provider/onboarding', tiffinProviderController.saveOnboarding);
    providerRoutes.post('/provider/onboarding/submit', tiffinProviderController.submitOnboarding);
    providerRoutes.post<{ Body: { documentType?: string; contentType?: string } }>('/provider/kyc/upload-url', tiffinProviderController.kycUploadUrl);
    providerRoutes.get('/provider/dashboard', tiffinProviderController.dashboard);
    providerRoutes.get('/provider/meal-changes', tiffinProviderController.mealChanges);
    providerRoutes.get('/provider/customers', tiffinProviderController.customers);
    providerRoutes.post('/provider/customers', tiffinProviderController.createCustomer);
    providerRoutes.get('/provider/customers/:id', tiffinProviderController.customer);
    providerRoutes.get('/provider/deliveries', tiffinProviderController.deliveries);
    providerRoutes.post('/provider/deliveries/mark-all', tiffinProviderController.markAllDeliveries);
    providerRoutes.patch('/provider/deliveries/:id', tiffinProviderController.updateDelivery);
    providerRoutes.get('/provider/menu', tiffinProviderController.menu);
    providerRoutes.put('/provider/menu', tiffinProviderController.saveMenu);
    providerRoutes.get('/provider/reports', tiffinProviderController.reports);
    providerRoutes.get('/provider/settings', tiffinProviderController.settings);
    providerRoutes.put('/provider/settings', tiffinProviderController.settings);
    providerRoutes.get('/provider/business-details', tiffinProviderController.businessDetails);
    providerRoutes.put('/provider/business-details', tiffinProviderController.businessDetails);
  });
}
