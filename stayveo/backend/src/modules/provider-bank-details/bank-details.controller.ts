import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/response.js';
import { providerBankDetailsService } from './bank-details.service.js';
import type { UpdateBankDetailsInput } from './bank-details.schema.js';

function authenticatedProviderId(request: FastifyRequest) {
  const providerId = request.providerAuth?.profileId;
  if (!providerId) throw { statusCode: 404, message: 'Provider profile not found' };
  return providerId;
}

export const providerBankDetailsController = {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const details = await providerBankDetailsService.get(authenticatedProviderId(request));
    return sendSuccess(reply, details);
  },

  async upsert(
    request: FastifyRequest<{ Body: UpdateBankDetailsInput }>,
    reply: FastifyReply,
  ) {
    const details = await providerBankDetailsService.save(authenticatedProviderId(request), request.body);
    return sendSuccess(reply, details, 'Bank details saved successfully');
  },
};
