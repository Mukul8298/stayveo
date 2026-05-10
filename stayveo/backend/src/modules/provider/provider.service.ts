// ─── Provider Service ───────────────────────────────────────────────────

import { providerRepository } from './provider.repository.js';
import {
  basicInfoSchema,
  createProviderSchema,
  photoUploadSchema,
  sendOtpSchema,
  serviceDetailsSchema,
  serviceSelectionSchema,
  updateProviderSchema,
  verifyIdSchema,
  verifyOtpSchema,
} from './provider.schema.js';
import type {
  BasicInfoInput,
  CreateProviderInput,
  PhotoUploadInput,
  ServiceDetailsInput,
  ServiceSelectionInput,
  UpdateProviderInput,
  VerifyIdInput,
  VerifyOtpInput,
} from './provider.schema.js';
import { userService } from '../users/user.service.js';

export const providerService = {
  /** Get provider by user ID */
  async getByUserId(userId: string) {
    const provider = await providerRepository.findByUserId(userId);
    if (!provider) throw { statusCode: 404, message: 'Provider profile not found' };
    return provider;
  },

  /** Get provider by provider ID */
  async getById(id: string) {
    const provider = await providerRepository.findById(id);
    if (!provider) throw { statusCode: 404, message: 'Provider not found' };
    return provider;
  },

  /** Create a provider profile */
  async create(userId: string, input: CreateProviderInput) {
    const data = createProviderSchema.parse(input);

    // Ensure the user exists
    await userService.getById(userId);

    // Check if provider profile already exists
    const existing = await providerRepository.findByUserId(userId);
    if (existing) throw { statusCode: 409, message: 'Provider profile already exists' };

    return providerRepository.create(userId, data);
  },

  /** Update provider profile */
  async update(userId: string, input: UpdateProviderInput) {
    const data = updateProviderSchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    return providerRepository.update(provider.id, data);
  },

  /** Send dummy OTP and create a pending onboarding profile if needed */
  async sendOtp(input: unknown) {
    const data = sendOtpSchema.parse(input);
    await providerRepository.createPendingOnboardingProfile(data.phone);

    return {
      phone: data.phone,
      otp: '1111',
      message: 'OTP sent',
    };
  },

  /** Verify dummy OTP and return existing-provider state */
  async verifyOtp(input: VerifyOtpInput) {
    const data = verifyOtpSchema.parse(input);
    if (data.otp !== '1111') {
      throw { statusCode: 400, message: 'Invalid OTP' };
    }

    const profile =
      (await providerRepository.findOnboardingByPhone(data.phone)) ??
      (await providerRepository.createPendingOnboardingProfile(data.phone));

    const verifiedProfile = await providerRepository.markOtpVerified(data.phone);

    return {
      message: profile.name ? 'Welcome back' : 'OTP verified. Please complete onboarding.',
      nextStep: profile.name ? 'dashboard' : 'basic_info',
      providerId: verifiedProfile.id,
      phone: verifiedProfile.phone,
      name: verifiedProfile.name,
      isVerified: verifiedProfile.isVerified,
    };
  },

  /** Save common provider onboarding info */
  async saveBasicInfo(input: BasicInfoInput) {
    const data = basicInfoSchema.parse(input);
    const existing = await providerRepository.findOnboardingByPhone(data.phone);

    if (existing && !existing.otpVerified) {
      throw { statusCode: 403, message: 'OTP verification required before onboarding' };
    }

    return providerRepository.saveBasicInfo(data);
  },

  /** Save multi-service selection */
  async saveServices(phone: string, input: ServiceSelectionInput) {
    const data = serviceSelectionSchema.parse({ ...input, phone });
    const profile = await providerService.getVerifiedOnboardingProfile(data.phone!);
    return providerRepository.saveServices(profile.id, data);
  },

  /** Save type-specific service details */
  async saveServiceDetails(phone: string, input: ServiceDetailsInput) {
    const data = serviceDetailsSchema.parse({ ...input, phone });
    const profile = await providerService.getVerifiedOnboardingProfile(data.phone!);
    return providerRepository.saveServiceDetails(profile.id, data);
  },

  /** Save photo URLs for a selected service */
  async savePhotos(phone: string, input: PhotoUploadInput) {
    const data = photoUploadSchema.parse({ ...input, phone });
    const profile = await providerService.getVerifiedOnboardingProfile(data.phone!);
    return providerRepository.savePhotos(profile.id, data);
  },

  /** Save one identity document; profile is verified only after AADHAR and PAN */
  async verifyIdentity(phone: string, input: VerifyIdInput) {
    const data = verifyIdSchema.parse({ ...input, phone });
    const profile = await providerService.getVerifiedOnboardingProfile(data.phone!);
    return providerRepository.saveVerification(profile.id, data);
  },

  /** Internal guard for onboarding steps after OTP */
  async getVerifiedOnboardingProfile(phone: string) {
    const profile = await providerRepository.findOnboardingByPhone(phone);
    if (!profile) throw { statusCode: 404, message: 'Provider profile not found' };
    if (!profile.otpVerified) {
      throw { statusCode: 403, message: 'OTP verification required before onboarding' };
    }
    return profile;
  },
};
