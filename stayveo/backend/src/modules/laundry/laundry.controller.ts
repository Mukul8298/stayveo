// ─── Laundry Controller ─────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { laundryService } from './laundry.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateLaundryInput, LaundryFilterInput } from './laundry.schema.js';

export const laundryController = {
  /** POST /laundry */
  async create(
    request: FastifyRequest<{ Body: CreateLaundryInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const laundry = await laundryService.create(userId, request.body);
    return sendCreated(reply, laundry, 'Laundry service created successfully');
  },

  /** GET /laundry */
  async list(
    request: FastifyRequest<{ Querystring: LaundryFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await laundryService.list(request.query as LaundryFilterInput);
    return sendSuccess(reply, result);
  },
};
