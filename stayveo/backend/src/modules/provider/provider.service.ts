// ─── Provider Service ───────────────────────────────────────────────────
// Business logic for provider authentication (email + password + OTP)
// and onboarding steps. Authentication is now email-based but all
// post-auth onboarding still uses phone via provider profile.
// ────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import { providerRepository } from './provider.repository.js';
import {
  basicInfoSchema,
  createProviderSchema,
  photoUploadSchema,
  sendOtpSchema,
  serviceDetailsSchema,
  serviceSelectionSchema,
  updateBusinessDetailsSchema,
  updateProviderSchema,
  verifyIdSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from './provider.schema.js';
import type {
  BasicInfoInput,
  CreateProviderInput,
  PhotoUploadInput,
  ResendOtpInput,
  ServiceDetailsInput,
  ServiceSelectionInput,
  UpdateBusinessDetailsInput,
  UpdateProviderInput,
  VerifyIdInput,
  VerifyOtpInput,
} from './provider.schema.js';
import { userService } from '../users/user.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from '../../common/utils/otp.utils.js';
import { sendOtpEmail } from '../../common/utils/email.service.js';
import { UserRole } from '@prisma/client';
import prisma from '../../common/db/prisma.js';

const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;

function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

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

  /**
   * Send OTP — email + password authentication for providers.
   *
   * - Existing PROVIDER with password → verify password → send OTP
   * - Existing user with STUDENT role → reject
   * - New user                        → hash password → send OTP (pending signup)
   */
  async sendOtp(input: unknown) {
    const data = sendOtpSchema.parse(input);
    const email = data.email;

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      // Role mismatch guard
      if (existingUser.role !== UserRole.PROVIDER) {
        throw {
          statusCode: 400,
          message: 'An account with this email exists with a different role.',
        };
      }

      // Legacy phone-auth user without password
      if (!existingUser.passwordHash) {
        throw {
          statusCode: 400,
          message: 'This account was created with phone authentication. Please contact support to set up email login.',
        };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(data.password, existingUser.passwordHash);
      if (!passwordValid) {
        throw { statusCode: 401, message: 'Invalid email or password.' };
      }

      // Generate & send OTP
      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      await authRepository.deleteChallengesByEmail(email, UserRole.PROVIDER);
      await authRepository.createChallenge({
        email,
        role: UserRole.PROVIDER,
        purpose: 'provider_login',
        otpHash,
        userId: existingUser.id,
        expiresAt: otpExpiry(),
      });

      await sendOtpEmail(email, otp);

      return {
        requiresOtp: true,
        email,
        message: 'Verification code sent to your email.',
      };
    }

    // New provider signup
    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await authRepository.deleteChallengesByEmail(email, UserRole.PROVIDER);
    await authRepository.createChallenge({
      email,
      role: UserRole.PROVIDER,
      purpose: 'provider_signup',
      otpHash,
      passwordHash: hashedPassword,
      expiresAt: otpExpiry(),
    });

    await sendOtpEmail(email, otp);

    return {
      requiresOtp: true,
      email,
      message: 'Verification code sent to your email.',
    };
  },

  /**
   * Verify OTP — completes provider authentication.
   *
   * Login  → load existing provider profile, determine nextStep
   * Signup → create user + pending provider profile, return basic_info step
   */
  async verifyOtp(input: VerifyOtpInput) {
    const data = verifyOtpSchema.parse(input);
    const email = data.email;

    const challenge = await authRepository.findActiveChallenge(email, UserRole.PROVIDER);
    if (!challenge) {
      throw {
        statusCode: 400,
        message: 'No active verification found. Please request a new code.',
      };
    }

    if (new Date() > challenge.expiresAt) {
      await authRepository.deleteChallenge(challenge.id);
      throw { statusCode: 400, message: 'Verification code has expired. Please request a new one.' };
    }

    if (!verifyOtpHash(data.otp, challenge.otpHash)) {
      throw { statusCode: 400, message: 'Invalid verification code.' };
    }

    // Invalidate challenge
    await authRepository.deleteChallenge(challenge.id);

    if (challenge.purpose === 'provider_login') {
      // ── Existing provider login ──────────────────────────────────
      const user = await authRepository.findByEmail(email);
      if (!user) throw { statusCode: 404, message: 'User not found.' };

      // Find provider profile by userId
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: user.id },
        include: {
          user: { select: { id: true, phone_number: true, role: true } },
          services: {
            include: { pgDetails: true, tiffinDetails: true },
          },
          verifications: true,
        },
      });

      if (!profile) {
        // User exists but no provider profile yet — treat as new onboarding
        return {
          message: 'Verified. Let\'s set up your provider profile.',
          nextStep: 'basic_info' as const,
          providerId: null,
          userId: user.id,
          phone: user.phone_number || '',
          name: null,
          services: [],
          isVerified: false,
        };
      }

      const selectedTypes = profile.services.map((s) => s.type);
      const tiffinOnly = selectedTypes.includes('TIFFIN') && !selectedTypes.includes('PG');
      let nextStep: 'dashboard' | 'basic_info' | 'tiffin_dashboard' | 'tiffin_onboarding' = profile.name ? 'dashboard' : 'basic_info';
      if (profile.name && tiffinOnly) {
        const kitchen = await prisma.tiffinKitchen.findUnique({ where: { ownerId: profile.id }, select: { id: true } });
        nextStep = kitchen ? 'tiffin_dashboard' : 'tiffin_onboarding';
      }

      return {
        message: profile.name ? 'Welcome back' : 'Verified. Please complete onboarding.',
        nextStep,
        providerId: profile.id,
        userId: user.id,
        phone: profile.phone,
        name: profile.name,
        services: selectedTypes,
        isVerified: profile.isVerified,
      };
    }

    // ── New provider signup ────────────────────────────────────────
    if (!challenge.passwordHash) {
      throw { statusCode: 500, message: 'Missing signup data. Please restart registration.' };
    }

    // Create user with PROVIDER role
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: challenge.passwordHash,
        role: UserRole.PROVIDER,
      },
    });

    // Create a minimal pending provider profile (phone will be set during basic-info)
    const newProfile = await prisma.providerProfile.create({
      data: {
        userId: newUser.id,
        phone: '', // Will be populated during basic-info onboarding step
      },
      include: {
        user: { select: { id: true, phone_number: true, role: true } },
        services: {
          include: { pgDetails: true, tiffinDetails: true },
        },
        verifications: true,
      },
    });

    return {
      message: 'Account created. Let\'s set up your provider profile.',
      nextStep: 'basic_info' as const,
      providerId: newProfile.id,
      userId: newUser.id,
      phone: '',
      name: null,
      services: [],
      isVerified: false,
    };
  },

  /**
   * Resend OTP — invalidate old challenge and send a fresh code.
   */
  async resendOtp(input: ResendOtpInput) {
    const data = resendOtpSchema.parse(input);
    const email = data.email;

    const existing = await authRepository.findActiveChallenge(email, UserRole.PROVIDER);
    if (!existing) {
      throw {
        statusCode: 400,
        message: 'No pending verification found. Please start the login process again.',
      };
    }

    const purpose = existing.purpose;
    const passwordHash = existing.passwordHash;
    const userId = existing.userId;

    await authRepository.deleteChallengesByEmail(email, UserRole.PROVIDER);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await authRepository.createChallenge({
      email,
      role: UserRole.PROVIDER,
      purpose,
      otpHash,
      passwordHash: passwordHash ?? undefined,
      userId: userId ?? undefined,
      expiresAt: otpExpiry(),
    });

    await sendOtpEmail(email, otp);

    return {
      message: 'New verification code sent to your email.',
      email,
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

  /**
   * Dashboard stats — fetches the 3 numbers shown on the profile card.
   */
  async getDashboardStats(phone: string) {
    const profile = await providerService.getVerifiedOnboardingProfile(phone);
    return providerRepository.getDashboardStats(profile.id);
  },

  /** Fetch current business details to pre-fill the edit form */
  async getBusinessDetails(phone: string) {
    const profile = await providerRepository.getOnboardingProfile(phone);
    if (!profile) throw { statusCode: 404, message: 'Provider profile not found' };
    return profile;
  },

  /**
   * Update business details from the settings page.
   */
  async updateBusinessDetails(phone: string, input: UpdateBusinessDetailsInput) {
    const data = updateBusinessDetailsSchema.parse(input);
    await providerService.getVerifiedOnboardingProfile(phone);
    return providerRepository.updateOnboardingProfileFields(phone, data);
  },
};
