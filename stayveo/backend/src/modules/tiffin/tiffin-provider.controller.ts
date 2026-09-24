import { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/response.js';
import { tiffinProviderService } from './tiffin-provider.service.js';
import { invalidateProviderDashboardCache, tiffinProviderDashboardKey } from '../../common/cache/provider-dashboard.js';

function ownerHeaders(request: FastifyRequest) {
  return {
    phone: request.providerAuth?.phone,
    userId: request.providerAuth?.userId,
  };
}

function authenticatedUserId(request: FastifyRequest) {
  if (!request.user?.id) {
    throw { statusCode: 401, message: 'Authentication required' };
  }
  return request.user.id;
}

async function invalidateDashboard(request: FastifyRequest) {
  const providerId = request.providerAuth?.profileId;
  if (!providerId) return;
  await invalidateProviderDashboardCache(
    request.server.redis,
    tiffinProviderDashboardKey(providerId),
    request.server.log
  );
}

export const tiffinProviderController = {
  async getOnboarding(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(reply, await tiffinProviderService.getOnboarding(undefined, authenticatedUserId(request), false));
  },

  async saveOnboarding(
    request: FastifyRequest<{ Body: { step?: string; data?: Record<string, unknown> } }>,
    reply: FastifyReply
  ) {
    const step = request.body?.step || '';
    return sendSuccess(reply, await tiffinProviderService.saveOnboarding(undefined, authenticatedUserId(request), step, request.body?.data || {}), 'Tiffin onboarding saved');
  },

  async submitOnboarding(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(reply, await tiffinProviderService.submitOnboarding(undefined, authenticatedUserId(request), false), 'Tiffin service submitted for verification');
  },

  async kycUploadUrl(
    request: FastifyRequest<{ Body: { documentType?: string; contentType?: string } }>,
    reply: FastifyReply
  ) {
    const body = request.body || {};
    return sendSuccess(
      reply,
      await tiffinProviderService.createKycUploadUrl(undefined, authenticatedUserId(request), body.documentType, body.contentType, false),
      'Secure KYC upload URL created'
    );
  },

  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getDashboard(owner.phone, owner.userId, request.server.redis, request.server.log));
  },

  async mealChanges(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getMealChanges(owner.phone, owner.userId, request.query as Record<string, unknown>));
  },

  async customers(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.listCustomers(owner.phone, owner.userId, request.query as Record<string, unknown>));
  },

  async createCustomer(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const owner = ownerHeaders(request);
    const result = await tiffinProviderService.addCustomer(owner.phone, owner.userId, request.body || {});
    await invalidateDashboard(request);
    return sendSuccess(reply, result, 'Customer added');
  },

  async customer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getCustomer(owner.phone, owner.userId, request.params.id));
  },

  async deliveries(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.listDeliveries(owner.phone, owner.userId, request.query as Record<string, unknown>));
  },

  async updateDelivery(request: FastifyRequest<{ Params: { id: string }; Body: { delivered?: boolean } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    const result = await tiffinProviderService.updateDelivery(owner.phone, owner.userId, request.params.id, request.body?.delivered !== false);
    await invalidateDashboard(request);
    return sendSuccess(reply, result, 'Delivery status updated');
  },

  async markAllDeliveries(request: FastifyRequest<{ Body: { ids?: string[] } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    const result = await tiffinProviderService.markAllDeliveries(owner.phone, owner.userId, request.body?.ids || []);
    await invalidateDashboard(request);
    return sendSuccess(reply, result, 'Deliveries marked as delivered');
  },

  async menu(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getMenu(owner.phone, owner.userId));
  },

  async saveMenu(request: FastifyRequest<{ Body: { menus?: unknown[] } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    const result = await tiffinProviderService.saveMenu(owner.phone, owner.userId, request.body?.menus || []);
    await invalidateDashboard(request);
    return sendSuccess(reply, result, 'Menu saved');
  },

  async reports(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getReports(owner.phone, owner.userId));
  },

  async settings(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    if (request.method === 'PUT') {
      const result = await tiffinProviderService.updateSettings(owner.phone, owner.userId, request.body as Record<string, unknown>);
      await invalidateDashboard(request);
      return sendSuccess(reply, result, 'Settings saved');
    }
    return sendSuccess(reply, await tiffinProviderService.getSettings(owner.phone, owner.userId));
  },

  async businessDetails(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    if (request.method === 'PUT') {
      const result = await tiffinProviderService.updateBusinessDetails(owner.phone, owner.userId, request.body as Record<string, unknown>);
      await invalidateDashboard(request);
      return sendSuccess(reply, result, 'Business details saved');
    }
    return sendSuccess(reply, await tiffinProviderService.getBusinessDetails(owner.phone, owner.userId));
  },
};
