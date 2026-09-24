// ─── Provider Controller ────────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { providerService } from './provider.service.js';
import { providerRepository } from './provider.repository.js';
import { providerDashboardService } from './provider-dashboard.service.js';
import { invalidateProviderDashboardCache, pgProviderDashboardKey } from '../../common/cache/provider-dashboard.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import {
  clearProviderSessionCookie,
  deleteProviderSession,
  PROVIDER_SESSION_COOKIE_NAME,
  providerSessionCookieOptions,
  touchProviderSession,
} from '../../common/auth/provider-session.js';
import type {
  BasicInfoInput,
  CreateProviderInput,
  PgOnboardingInput,
  PhotoUploadInput,
  ResendOtpInput,
  SelectTypeInput,
  SendOtpInput,
  ServiceDetailsInput,
  ServiceSelectionInput,
  UpdateBusinessDetailsInput,
  VerifyIdInput,
  VerifyOtpInput,
} from './provider.schema.js';

function getProviderPhone(body: { phone?: string }, request: FastifyRequest) {
  const phone = request.providerAuth?.phone;

  if (!phone) {
    throw { statusCode: 400, message: 'Provider phone is required' };
  }

  return phone;
}

async function invalidatePgDashboard(request: FastifyRequest) {
  const providerId = request.providerAuth?.profileId;
  if (!providerId) return;
  await invalidateProviderDashboardCache(
    request.server.redis,
    pgProviderDashboardKey(providerId),
    request.server.log
  );
}

export const providerController = {
  /** POST /provider — Create provider profile */
  async create(
    request: FastifyRequest<{ Body: CreateProviderInput }>,
    reply: FastifyReply
  ) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const provider = await providerService.create(userId, request.body);
    return sendCreated(reply, provider, 'Provider created successfully');
  },

  /** GET /provider/me — Get current provider's profile */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const provider = await providerRepository.findCurrentByUserId(userId);
    if (!provider) throw { statusCode: 404, message: 'Provider profile not found' };
    return sendSuccess(reply, provider);
  },

  /** GET /provider/dashboard — cached non-financial summary + live revenue */
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const dashboard = await providerDashboardService.getPgDashboard(
      request.server.redis,
      request.server.log,
      userId
    );
    return sendSuccess(reply, dashboard);
  },

  /** POST /provider/send-otp */
  async sendOtp(request: FastifyRequest<{ Body: SendOtpInput }>, reply: FastifyReply) {
    try {
      const result = await providerService.sendOtp(request.body);
      return sendSuccess(reply, result, 'OTP sent');
    } catch (error) {
      request.log.error({ err: error }, 'Provider OTP delivery/authentication failed');
      throw error;
    }
  },

  /** POST /provider/verify-otp */
  async verifyOtp(request: FastifyRequest<{ Body: VerifyOtpInput }>, reply: FastifyReply) {
    const result = await providerService.verifyOtp(request.body, request.server.redis);
    const { sessionId, ...publicResult } = result;

    if (sessionId) {
      reply.setCookie(PROVIDER_SESSION_COOKIE_NAME, sessionId, providerSessionCookieOptions());
    }

    return sendSuccess(reply, publicResult, publicResult.message);
  },

  /** POST /provider/logout */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = request.cookies[PROVIDER_SESSION_COOKIE_NAME];
    if (sessionId) {
      try {
        await deleteProviderSession(request.server.redis, sessionId, request.providerAuth?.userId);
      } catch (error) {
        request.server.log.error({ err: error }, 'Provider logout session deletion failed');
        return reply.status(503).send({
          success: false,
          data: null,
          message: 'Logout service temporarily unavailable',
        });
      }
    }
    clearProviderSessionCookie(reply);
    return sendSuccess(reply, null, 'Logged out successfully');
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
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const profile = await providerService.saveBasicInfo(userId, request.body);
    const sessionId = request.cookies[PROVIDER_SESSION_COOKIE_NAME];
    if (sessionId && request.providerSession && profile?.id) {
      await touchProviderSession(request.server.redis, sessionId, {
        ...request.providerSession,
        providerId: profile.id,
      });
    }
    await invalidatePgDashboard(request);
    return sendSuccess(reply, profile, 'Provider basic info saved');
  },

  /** POST /provider/services */
  async saveServices(
    request: FastifyRequest<{ Body: ServiceSelectionInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const profile = await providerService.saveServices(phone, request.body);
    await invalidatePgDashboard(request);
    return sendSuccess(reply, profile, 'Provider services saved');
  },

  /** POST /provider/service-details */
  async saveServiceDetails(
    request: FastifyRequest<{ Body: ServiceDetailsInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const details = await providerService.saveServiceDetails(phone, request.body);
    await invalidatePgDashboard(request);
    return sendSuccess(reply, details, 'Service details saved');
  },

  /** POST /provider/photos */
  async savePhotos(
    request: FastifyRequest<{ Body: PhotoUploadInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const details = await providerService.savePhotos(phone, request.body);
    await invalidatePgDashboard(request);
    return sendSuccess(reply, details, 'Photos saved');
  },

  /** POST /provider/verify-id */
  async verifyIdentity(
    request: FastifyRequest<{ Body: VerifyIdInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone(request.body, request);
    const profile = await providerService.verifyIdentity(phone, request.body);
    await invalidatePgDashboard(request);
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
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const dashboard = await providerDashboardService.getPgDashboard(
      request.server.redis,
      request.server.log,
      userId
    );
    return sendSuccess(reply, {
      activeListings: dashboard.activeListings,
      totalBookings: dashboard.bookings.total,
      totalEarnings: dashboard.totalEarnings,
    });
  },

  /** GET /provider/business-details — prefill the edit form */
  async getBusinessDetails(request: FastifyRequest, reply: FastifyReply) {
    const phone = getProviderPhone({}, request);
    const details = await providerService.getBusinessDetails(phone);
    return sendSuccess(reply, details);
  },

  /** PUT /provider/business-details — save the edited form */
  async updateBusinessDetails(
    request: FastifyRequest<{ Body: UpdateBusinessDetailsInput }>,
    reply: FastifyReply
  ) {
    const phone = getProviderPhone({}, request);
    const updated = await providerService.updateBusinessDetails(phone, request.body);
    await invalidatePgDashboard(request);
    return sendSuccess(reply, updated, 'Business details updated successfully');
  },

  /** POST /provider/select-type */
  async selectType(
    request: FastifyRequest<{ Body: SelectTypeInput }>,
    reply: FastifyReply
  ) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const profile = await providerService.selectType(userId, request.body);
    const sessionId = request.cookies[PROVIDER_SESSION_COOKIE_NAME];
    if (sessionId && request.providerSession) {
      await touchProviderSession(request.server.redis, sessionId, {
        ...request.providerSession,
        providerType: request.body.providerType,
      });
    }
    return sendSuccess(reply, profile, 'Provider type updated');
  },

  /** POST /provider/pg-onboarding */
  async savePgOnboarding(
    request: FastifyRequest<{ Body: PgOnboardingInput }>,
    reply: FastifyReply
  ) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const profile = await providerService.savePgOnboarding(userId, request.body);
    await invalidatePgDashboard(request);
    return sendSuccess(reply, profile, 'PG Onboarding saved successfully');
  },

  /** POST /provider/complete-onboarding */
  async completeOnboarding(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = request.providerAuth?.userId;
    if (!userId) throw { statusCode: 401, message: 'Provider authentication required' };
    const profile = await providerService.completeOnboarding(userId);
    return sendSuccess(reply, profile, 'Onboarding completed');
  },
};
