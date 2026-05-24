import { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/response.js';
import { collegeService } from './college.service.js';
import type { CollegeQueryInput } from './college.schema.js';

export const collegeController = {
  async list(
    request: FastifyRequest<{ Querystring: CollegeQueryInput }>,
    reply: FastifyReply
  ) {
    const result = await collegeService.list(request.query);
    return sendSuccess(reply, result);
  },

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await collegeService.getById(request.params.id);
    return sendSuccess(reply, result);
  },
};
