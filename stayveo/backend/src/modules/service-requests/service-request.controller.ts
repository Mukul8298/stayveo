import { FastifyReply, FastifyRequest } from 'fastify';
import { USER_ID_HEADER } from '../../common/constants.js';
import { sendCreated, sendSuccess } from '../../common/utils/response.js';
import { serviceRequestService } from './service-request.service.js';
import type {
  AcceptServiceRequestInput,
  CreateServiceRequestInput,
  DeclineServiceRequestInput,
  ServiceRequestFilterInput,
} from './service-request.schema.js';

export const serviceRequestController = {
  async create(request: FastifyRequest<{ Body: CreateServiceRequestInput }>, reply: FastifyReply) {
    const studentId = request.headers[USER_ID_HEADER] as string;
    const result = await serviceRequestService.create(studentId, request.body);
    return sendCreated(reply, result, 'Request sent successfully');
  },

  async listStudent(request: FastifyRequest<{ Querystring: ServiceRequestFilterInput }>, reply: FastifyReply) {
    const studentId = request.headers[USER_ID_HEADER] as string;
    const result = await serviceRequestService.listByStudent(studentId, request.query);
    return sendSuccess(reply, result);
  },

  async listProvider(
    request: FastifyRequest<{ Params: { providerId: string }; Querystring: ServiceRequestFilterInput }>,
    reply: FastifyReply
  ) {
    const result = await serviceRequestService.listByProvider(request.params.providerId, request.query);
    return sendSuccess(reply, result);
  },

  async accept(
    request: FastifyRequest<{ Params: { id: string }; Body: AcceptServiceRequestInput; Headers: { 'x-provider-id'?: string } }>,
    reply: FastifyReply
  ) {
    const result = await serviceRequestService.accept(
      request.params.id,
      request.headers['x-provider-id'] || '',
      request.body
    );
    return sendSuccess(reply, result, 'Request accepted');
  },

  async decline(
    request: FastifyRequest<{ Params: { id: string }; Body: DeclineServiceRequestInput; Headers: { 'x-provider-id'?: string } }>,
    reply: FastifyReply
  ) {
    const result = await serviceRequestService.decline(
      request.params.id,
      request.headers['x-provider-id'] || '',
      request.body
    );
    return sendSuccess(reply, result, 'Request declined');
  },
};
