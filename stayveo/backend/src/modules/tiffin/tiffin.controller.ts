// ─── Tiffin Controller ──────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { tiffinService } from './tiffin.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateTiffinInput, TiffinFilterInput } from './tiffin.schema.js';

export const tiffinController = {
  /** POST /tiffin */
  async create(
    request: FastifyRequest<{ Body: CreateTiffinInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const tiffin = await tiffinService.create(userId, request.body);
    return sendCreated(reply, tiffin, 'Tiffin service created successfully');
  },

  /** GET /tiffin */
  async list(
    request: FastifyRequest<{ Querystring: TiffinFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await tiffinService.list(request.query as TiffinFilterInput);
    return sendSuccess(reply, result);
  },
};
