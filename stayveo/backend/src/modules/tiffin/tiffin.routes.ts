// ─── Tiffin Routes ──────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { tiffinController } from './tiffin.controller.js';
import { tiffinProviderController } from './tiffin-provider.controller.js';

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

  // Provider-only Tiffin experience. These routes resolve ownership from
  // x-provider-phone + x-user-id and never accept a provider id from the UI.
  fastify.get('/provider/onboarding', tiffinProviderController.getOnboarding);
  fastify.put('/provider/onboarding', tiffinProviderController.saveOnboarding);
  fastify.post('/provider/onboarding/submit', tiffinProviderController.submitOnboarding);
  fastify.post('/provider/kyc/upload-url', tiffinProviderController.kycUploadUrl);
  fastify.get('/provider/dashboard', tiffinProviderController.dashboard);
  fastify.get('/provider/meal-changes', tiffinProviderController.mealChanges);
  fastify.get('/provider/customers', tiffinProviderController.customers);
  fastify.post('/provider/customers', tiffinProviderController.createCustomer);
  fastify.get('/provider/customers/:id', tiffinProviderController.customer);
  fastify.get('/provider/deliveries', tiffinProviderController.deliveries);
  fastify.post('/provider/deliveries/mark-all', tiffinProviderController.markAllDeliveries);
  fastify.patch('/provider/deliveries/:id', tiffinProviderController.updateDelivery);
  fastify.get('/provider/menu', tiffinProviderController.menu);
  fastify.put('/provider/menu', tiffinProviderController.saveMenu);
  fastify.get('/provider/reports', tiffinProviderController.reports);
  fastify.get('/provider/settings', tiffinProviderController.settings);
  fastify.put('/provider/settings', tiffinProviderController.settings);
  fastify.get('/provider/business-details', tiffinProviderController.businessDetails);
  fastify.put('/provider/business-details', tiffinProviderController.businessDetails);
}
