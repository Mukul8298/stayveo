// ─── PG Controller ──────────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { pgService } from './pg.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreatePGInput, PGFilterInput } from './pg.schema.js';

export const pgController = {
  /** POST /pg — Create a PG listing */
  async create(
    request: FastifyRequest<{ Body: CreatePGInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const pg = await pgService.create(userId, request.body);
    return sendCreated(reply, pg, 'PG listing created successfully');
  },

  /** GET /pg/:id — Get PG details */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const pg = await pgService.getById(request.params.id);
    return sendSuccess(reply, pg);
  },

  /** GET /pg — List PGs with filters (price, amenities, geo radius) */
  async list(
    request: FastifyRequest<{ Querystring: PGFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await pgService.list(request.query as PGFilterInput);
    return sendSuccess(reply, result);
  },
};
