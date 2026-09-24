// ─── Auth Service ───────────────────────────────────────────────────────
// Business logic for email + password + 4-digit email OTP authentication.
//
// Flow:
//   1. startAuth  → validate credentials, generate & send OTP
//   2. verifyOtp  → verify OTP, create/authenticate user
//   3. resendOtp  → invalidate old OTP, send new one
//
// Existing user detection and new user creation preserve the same UUID
// and downstream data structures that the rest of the app expects.
// ────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository.js';
import { startAuthSchema, verifyOtpSchema, resendOtpSchema } from './auth.schema.js';
import type { StartAuthInput, VerifyOtpInput, ResendOtpInput } from './auth.schema.js';
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from '../../common/utils/otp.utils.js';
import { sendOtpEmail } from '../../common/utils/email.service.js';
import { yearToDisplay } from '../../common/utils/year.js';
import { UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { createProfileSetupToken, createSession } from '../../common/auth/session.js';

const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;

function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

export const authService = {
  /**
   * STEP 1: Start Authentication (replaces sendOtp)
   *
   * - Existing user with correct role → verify password → send OTP
   * - Existing user with wrong role  → reject
   * - New user                       → hash password → send OTP (pending signup)
   */
  async startAuth(input: StartAuthInput) {
    const { email, password, role } = startAuthSchema.parse(input);
    const prismaRole = role === 'STUDENT' ? UserRole.STUDENT : UserRole.PROVIDER;

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      // ── Role mismatch guard ────────────────────────────────────────
      if (existingUser.role !== prismaRole) {
        throw {
          statusCode: 400,
          message: 'An account with this email exists with a different role.',
        };
      }

      // ── Existing user: verify password ─────────────────────────────
      if (!existingUser.passwordHash) {
        // Legacy phone-auth user who never set a password.
        // We cannot verify them yet — they need a migration path.
        throw {
          statusCode: 400,
          message: 'This account was created with phone authentication. Please contact support to set up email login.',
        };
      }

      const passwordValid = await bcrypt.compare(password, existingUser.passwordHash);
      if (!passwordValid) {
        throw { statusCode: 401, message: 'Invalid email or password.' };
      }

      // ── Generate & send OTP ────────────────────────────────────────
      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      // Clean up previous challenges for this email+role
      await authRepository.deleteChallengesByEmail(email, prismaRole);

      await authRepository.createChallenge({
        email,
        role: prismaRole,
        purpose: 'login',
        otpHash,
        userId: existingUser.id,
        expiresAt: otpExpiry(),
      });

      await sendOtpEmail(email, otp);

      return {
        requiresOtp: true,
        email,
        isNewUser: false,
        message: 'Verification code sent to your email.',
      };
    }

    // ── New user: hash password, store pending signup ─────────────────
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Clean up any stale challenges
    await authRepository.deleteChallengesByEmail(email, prismaRole);

    await authRepository.createChallenge({
      email,
      role: prismaRole,
      purpose: 'signup',
      otpHash,
      passwordHash: hashedPassword,
      expiresAt: otpExpiry(),
    });

    await sendOtpEmail(email, otp);

    return {
      requiresOtp: true,
      email,
      isNewUser: true,
      message: 'Verification code sent to your email.',
    };
  },

  /**
   * STEP 2: Verify OTP
   *
   * - Login challenge  → authenticate existing user
   * - Signup challenge → create user, then authenticate
   */
  async verifyOtp(input: VerifyOtpInput, redis: Redis) {
    const { email, otp, role } = verifyOtpSchema.parse(input);
    const prismaRole = role === 'STUDENT' ? UserRole.STUDENT : UserRole.PROVIDER;

    // Find the most recent active challenge
    const challenge = await authRepository.findActiveChallenge(email, prismaRole);

    if (!challenge) {
      throw {
        statusCode: 400,
        message: 'No active verification found. Please request a new code.',
      };
    }

    // Check expiry
    if (new Date() > challenge.expiresAt) {
      await authRepository.deleteChallenge(challenge.id);
      throw { statusCode: 400, message: 'Verification code has expired. Please request a new one.' };
    }

    // Verify OTP hash
    if (!verifyOtpHash(otp, challenge.otpHash)) {
      throw { statusCode: 400, message: 'Invalid verification code.' };
    }

    // Invalidate the challenge immediately (cannot be reused)
    await authRepository.deleteChallenge(challenge.id);

    if (challenge.purpose === 'login') {
      // ── Existing user login ────────────────────────────────────────
      const user = await authRepository.findByEmailWithProfile(email);
      if (!user) {
        throw { statusCode: 404, message: 'User not found.' };
      }

      const hasProfile = !!user.studentProfile;

      if (hasProfile) {
        const sessionId = await createSession(redis, user.id, user.role);
        return {
          sessionId,
          isProfileComplete: true,
          userId: user.id,
          message: `Welcome back ${user.studentProfile!.fullName} 👋`,
          data: {
            id: user.studentProfile!.id,
            fullName: user.studentProfile!.fullName,
            college: user.studentProfile!.college,
            year: yearToDisplay(user.studentProfile!.year),
            gender: user.studentProfile!.gender,
            foodPreference: user.studentProfile!.foodPreference,
            sleepSchedule: user.studentProfile!.sleepSchedule,
            cleanlinessLevel: user.studentProfile!.cleanlinessLevel,
            studyHabits: user.studentProfile!.studyHabits,
            personalityType: user.studentProfile!.personalityType,
            locationPreference: user.studentProfile!.locationPreference,
            budget: user.studentProfile!.budget,
            profileImageUrl: user.studentProfile!.profileImageUrl,
          },
        };
      }
      return {
        profileSetupToken: createProfileSetupToken(user.id, user.role),
        isProfileComplete: false,
        userId: user.id,
        nextStep: 'complete_profile',
        message: 'Verified. Please complete your profile.'
      };
    }

    // ── Signup: create new user ──────────────────────────────────────
    if (!challenge.passwordHash) {
      throw { statusCode: 500, message: 'Missing signup data. Please restart registration.' };
    }

    const newUser = await authRepository.createUser(email, challenge.passwordHash, prismaRole);

    return {
      profileSetupToken: createProfileSetupToken(newUser.id, newUser.role),
      isProfileComplete: false,
      userId: newUser.id,
      nextStep: 'complete_profile',
      message: 'Account created. Please complete your profile.',
    };
  },

  /** Resolve the current authenticated user from the server-side session. */
  async getCurrentUser(userId: string) {
    const user = await authRepository.findByIdWithProfiles(userId);
    if (!user) throw { statusCode: 401, message: 'Authentication required' };

    const profile = user.role === UserRole.STUDENT
      ? user.studentProfile
      : user.providerProfile || user.provider;

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
        collegeId: user.collegeId,
        collegeName: user.collegeName,
        profile,
      },
    };
  },

  /**
   * STEP 3: Resend OTP
   *
   * Invalidates existing challenges and sends a fresh OTP.
   * Requires an active pending auth flow (either login or signup).
   */
  async resendOtp(input: ResendOtpInput) {
    const { email, role } = resendOtpSchema.parse(input);
    const prismaRole = role === 'STUDENT' ? UserRole.STUDENT : UserRole.PROVIDER;

    // Find existing challenge to preserve its purpose + data
    const existing = await authRepository.findActiveChallenge(email, prismaRole);

    if (!existing) {
      throw {
        statusCode: 400,
        message: 'No pending verification found. Please start the login process again.',
      };
    }

    const purpose = existing.purpose;
    const passwordHash = existing.passwordHash;
    const userId = existing.userId;

    // Delete all old challenges
    await authRepository.deleteChallengesByEmail(email, prismaRole);

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await authRepository.createChallenge({
      email,
      role: prismaRole,
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
};
