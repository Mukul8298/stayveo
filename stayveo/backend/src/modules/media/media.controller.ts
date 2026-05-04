// ─── Media Controller ───────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { mediaService } from './media.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { UploadMediaInput } from './media.schema.js';

export const mediaController = {
  /** POST /media/upload — Save media file URL */
  async upload(
    request: FastifyRequest<{ Body: UploadMediaInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const media = await mediaService.upload(userId, request.body);
    return sendCreated(reply, media, 'Media uploaded successfully');
  },

  /** GET /media/:providerId — Get all media for a provider */
  async getByProvider(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const media = await mediaService.getByProviderId(request.params.providerId);
    return sendSuccess(reply, media);
  },
};
