// ─── Cleaning Controller ────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { cleaningService } from './cleaning.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateCleaningInput, CleaningFilterInput } from './cleaning.schema.js';

export const cleaningController = {
  /** POST /cleaning */
  async create(
    request: FastifyRequest<{ Body: CreateCleaningInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const cleaning = await cleaningService.create(userId, request.body);
    return sendCreated(reply, cleaning, 'Cleaning service created successfully');
  },

  /** GET /cleaning */
  async list(
    request: FastifyRequest<{ Querystring: CleaningFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await cleaningService.list(request.query as CleaningFilterInput);
    return sendSuccess(reply, result);
  },
};
