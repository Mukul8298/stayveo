// ─── Service Selection Controller ───────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { serviceSelectionService } from './service.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { AddServicesInput } from './service.schema.js';
import { invalidateProviderDashboardCache, pgProviderDashboardKey } from '../../common/cache/provider-dashboard.js';

export const serviceController = {
  /** POST /provider/services — Add service types */
  async addServices(
    request: FastifyRequest<{ Body: AddServicesInput }>,
    reply: FastifyReply
  ) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const services = await serviceSelectionService.addServices(userId, request.body);
    if (request.providerAuth?.profileId) {
      await invalidateProviderDashboardCache(request.server.redis, pgProviderDashboardKey(request.providerAuth.profileId), request.server.log);
    }
    return sendCreated(reply, services, 'Services added successfully');
  },

  /** GET /provider/services — Get selected services */
  async getServices(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const services = await serviceSelectionService.getServices(userId);
    return sendSuccess(reply, services);
  },
};
