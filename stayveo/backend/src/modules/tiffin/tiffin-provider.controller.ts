import { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/response.js';
import { tiffinProviderService } from './tiffin-provider.service.js';

function header(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function ownerHeaders(request: FastifyRequest) {
  return {
    phone: header(request, 'x-provider-phone'),
    userId: header(request, 'x-user-id'),
  };
}

export const tiffinProviderController = {
  async getOnboarding(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getOnboarding(owner.phone, owner.userId));
  },

  async saveOnboarding(
    request: FastifyRequest<{ Body: { step?: string; data?: Record<string, unknown> } }>,
    reply: FastifyReply
  ) {
    const owner = ownerHeaders(request);
    const step = request.body?.step || '';
    return sendSuccess(reply, await tiffinProviderService.saveOnboarding(owner.phone, owner.userId, step, request.body?.data || {}), 'Tiffin onboarding saved');
  },

  async submitOnboarding(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.submitOnboarding(owner.phone, owner.userId), 'Tiffin service submitted for verification');
  },

  async kycUploadUrl(
    request: FastifyRequest<{ Body: { documentType?: string; contentType?: string } }>,
    reply: FastifyReply
  ) {
    const owner = ownerHeaders(request);
    const body = request.body || {};
    return sendSuccess(
      reply,
      await tiffinProviderService.createKycUploadUrl(owner.phone, owner.userId, body.documentType, body.contentType),
      'Secure KYC upload URL created'
    );
  },

  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getDashboard(owner.phone, owner.userId));
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
    return sendSuccess(reply, await tiffinProviderService.addCustomer(owner.phone, owner.userId, request.body || {}), 'Customer added');
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
    return sendSuccess(reply, await tiffinProviderService.updateDelivery(owner.phone, owner.userId, request.params.id, request.body?.delivered !== false), 'Delivery status updated');
  },

  async markAllDeliveries(request: FastifyRequest<{ Body: { ids?: string[] } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.markAllDeliveries(owner.phone, owner.userId, request.body?.ids || []), 'Deliveries marked as delivered');
  },

  async menu(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getMenu(owner.phone, owner.userId));
  },

  async saveMenu(request: FastifyRequest<{ Body: { menus?: unknown[] } }>, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.saveMenu(owner.phone, owner.userId, request.body?.menus || []), 'Menu saved');
  },

  async reports(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    return sendSuccess(reply, await tiffinProviderService.getReports(owner.phone, owner.userId));
  },

  async settings(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    if (request.method === 'PUT') {
      return sendSuccess(reply, await tiffinProviderService.updateSettings(owner.phone, owner.userId, request.body as Record<string, unknown>), 'Settings saved');
    }
    return sendSuccess(reply, await tiffinProviderService.getSettings(owner.phone, owner.userId));
  },

  async businessDetails(request: FastifyRequest, reply: FastifyReply) {
    const owner = ownerHeaders(request);
    if (request.method === 'PUT') {
      return sendSuccess(reply, await tiffinProviderService.updateBusinessDetails(owner.phone, owner.userId, request.body as Record<string, unknown>), 'Business details saved');
    }
    return sendSuccess(reply, await tiffinProviderService.getBusinessDetails(owner.phone, owner.userId));
  },
};
