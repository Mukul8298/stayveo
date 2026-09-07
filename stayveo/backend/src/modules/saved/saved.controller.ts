import { FastifyReply, FastifyRequest } from 'fastify';
import { USER_ID_HEADER } from '../../common/constants.js';
import { sendCreated, sendSuccess } from '../../common/utils/response.js';
import { savedService } from './saved.service.js';

export const savedController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string | undefined;
    const listings = await savedService.list(userId);
    return sendSuccess(reply, { listings });
  },

  async ids(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string | undefined;
    const ids = await savedService.ids(userId);
    return sendSuccess(reply, { ids });
  },

  async save(
    request: FastifyRequest<{ Params: { roomId: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string | undefined;
    const result = await savedService.save(userId, request.params.roomId);
    return sendCreated(reply, result, 'Listing saved');
  },

  async remove(
    request: FastifyRequest<{ Params: { roomId: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string | undefined;
    const result = await savedService.remove(userId, request.params.roomId);
    return sendSuccess(reply, result, 'Listing removed');
  },
};
