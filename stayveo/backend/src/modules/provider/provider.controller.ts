// ─── Provider Controller ────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { providerService } from './provider.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import type {
  BasicInfoInput,
  CreateProviderInput,
  PhotoUploadInput,
  ResendOtpInput,
  SendOtpInput,
  ServiceDetailsInput,
  ServiceSelectionInput,
  UpdateBusinessDetailsInput,
  VerifyIdInput,
  VerifyOtpInput,
} from './provider.schema.js';

function getProviderPhone(body: { phone?: string }, request: FastifyRequest) {
  const headerPhone = request.headers['x-provider-phone'];
  const phone = body.phone || (Array.isArray(headerPhone) ? headerPhone[0] : headerPhone);

  if (!phone) {
    throw { statusCode: 400, message: 'Provider phone is required' };
  }

  return phone;
}

export const providerController = {
  /** POST /provider — Create provider profile */
  async create(
    request: FastifyRequest<{ Body: CreateProviderInput }>,
    reply: FastifyReply
  ) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const provider = await providerService.create(userId, request.body);
    return sendCreated(reply, provider, 'Provider created successfully');
  },

  /** GET /provider/me — Get current provider's profile */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.headers[USER_ID_HEADER] as string;
    const provider = await providerService.getByUserId(userId);
    return sendSuccess(reply, provider);
  },

  /** POST /provider/send-otp */
  async sendOtp(request: FastifyRequest<{ Body: SendOtpInput }>, reply: FastifyReply) {
    const result = await providerService.sendOtp(request.body);
    return sendSuccess(reply, result, 'OTP sent');
  },

  /** POST /provider/verify-otp */
  async verifyOtp(request: FastifyRequest<{ Body: VerifyOtpInput }>, reply: FastifyReply) {
    const result = await providerService.verifyOtp(request.body);
    return sendSuccess(reply, result, result.message);
  },

  /** POST /provider/resend-otp */
  async resendOtp(request: FastifyRequest<{ Body: ResendOtpInput }>, reply: FastifyReply) {
    const result = await providerService.resendOtp(request.body);
    return sendSuccess(reply, result, result.message);
  },

  /** POST /provider/basic-info */
  async saveBasicInfo(
    request: FastifyRequest<{ Body: BasicInfoInput }>,
    reply: FastifyReply
  ) {
    const profile = await providerService.saveBasicInfo(request.body);
    return sendSuccess(reply, profile, 'Provider basic info saved');
  },

  /** POST /provider/services */
  async saveServices(
    request: FastifyRequest<{ Body: ServiceSelectionInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const profile = await providerService.saveServices(phone, request.body);
    return sendSuccess(reply, profile, 'Provider services saved');
  },

  /** POST /provider/service-details */
  async saveServiceDetails(
    request: FastifyRequest<{ Body: ServiceDetailsInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const details = await providerService.saveServiceDetails(phone, request.body);
    return sendSuccess(reply, details, 'Service details saved');
  },

  /** POST /provider/photos */
  async savePhotos(
    request: FastifyRequest<{ Body: PhotoUploadInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const details = await providerService.savePhotos(phone, request.body);
    return sendSuccess(reply, details, 'Photos saved');
  },

  /** POST /provider/verify-id */
  async verifyIdentity(
    request: FastifyRequest<{ Body: VerifyIdInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const profile = await providerService.verifyIdentity(phone, request.body);
    return sendSuccess(reply, profile, 'Identity verification saved');
  },

  /**
   * GET /provider/dashboard-stats
   * Returns: { activeListings, totalBookings, totalEarnings }
   *
   * Why GET (not POST)? This endpoint only reads data, never mutates.
   * HTTP semantics: GET = read, POST/PUT = write.
   */
  async getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
    const headerPhone = request.headers['x-provider-phone'];
    const phone = Array.isArray(headerPhone) ? headerPhone[0] : headerPhone;
    if (!phone) throw { statusCode: 400, message: 'Provider phone is required' };
    const stats = await providerService.getDashboardStats(phone);
    return sendSuccess(reply, stats);
  },

  /** GET /provider/business-details — prefill the edit form */
  async getBusinessDetails(request: FastifyRequest, reply: FastifyReply) {
    const headerPhone = request.headers['x-provider-phone'];
    const phone = Array.isArray(headerPhone) ? headerPhone[0] : headerPhone;
    if (!phone) throw { statusCode: 400, message: 'Provider phone is required' };
    const details = await providerService.getBusinessDetails(phone);
    return sendSuccess(reply, details);
  },

  /** PUT /provider/business-details — save the edited form */
  async updateBusinessDetails(
    request: FastifyRequest<{ Body: UpdateBusinessDetailsInput }>,
    reply: FastifyReply
  ) {
    const headerPhone = request.headers['x-provider-phone'];
    const phone = Array.isArray(headerPhone) ? headerPhone[0] : headerPhone;
    if (!phone) throw { statusCode: 400, message: 'Provider phone is required' };
    const updated = await providerService.updateBusinessDetails(phone, request.body);
    return sendSuccess(reply, updated, 'Business details updated successfully');
  },
};
