// ─── Document Controller ────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { documentService } from './document.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type { CreateDocumentInput } from './document.schema.js';

export const documentController = {
  /** POST /documents — Upload a document */
  async create(
    request: FastifyRequest<{ Body: CreateDocumentInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const doc = await documentService.create(userId, request.body);
    return sendCreated(reply, doc, 'Document uploaded successfully');
  },

  /** GET /documents/:providerId — Get documents for a provider */
  async getByProvider(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const docs = await documentService.getByProviderId(request.params.providerId);
    return sendSuccess(reply, docs);
  },
};
