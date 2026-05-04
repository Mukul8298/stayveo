// ─── Provider Controller ────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { providerService } from './provider.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateProviderInput } from './provider.schema.js';

export const providerController = {
  /** POST /provider — Create provider profile */
  async create(
    request: FastifyRequest<{ Body: CreateProviderInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const provider = await providerService.create(userId, request.body);
    return sendCreated(reply, provider, 'Provider created successfully');
  },

  /** GET /provider/me — Get current provider's profile */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const provider = await providerService.getByUserId(userId);
    return sendSuccess(reply, provider);
  },
};
