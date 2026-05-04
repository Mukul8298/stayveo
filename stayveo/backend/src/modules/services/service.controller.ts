// ─── Service Selection Controller ───────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { serviceSelectionService } from './service.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { AddServicesInput } from './service.schema.js';

export const serviceController = {
  /** POST /provider/services — Add service types */
  async addServices(
    request: FastifyRequest<{ Body: AddServicesInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const services = await serviceSelectionService.addServices(userId, request.body);
    return sendCreated(reply, services, 'Services added successfully');
  },

  /** GET /provider/services — Get selected services */
  async getServices(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const services = await serviceSelectionService.getServices(userId);
    return sendSuccess(reply, services);
  },
};
