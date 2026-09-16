import { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/response.js';
import { collegeService } from './college.service.js';
import type { CollegeQueryInput } from './college.schema.js';

export const collegeController = {
  async list(
    request: FastifyRequest<{ Querystring: CollegeQueryInput }>,
    reply: FastifyReply
  ) {
    reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    const result = await collegeService.list(request.query);
    return sendSuccess(reply, result);
  },

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    const result = await collegeService.getById(request.params.id);
    return sendSuccess(reply, result);
  },
};
