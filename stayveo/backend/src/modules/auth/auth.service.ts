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
import crypto from 'node:crypto';
import { authRepository } from './auth.repository.js';
import { startAuthSchema, verifyOtpSchema, resendOtpSchema, forgotPasswordSchema, verifyPasswordResetSchema, resetPasswordSchema } from './auth.schema.js';
import type { StartAuthInput, VerifyOtpInput, ResendOtpInput, ForgotPasswordInput, VerifyPasswordResetInput, ResetPasswordInput } from './auth.schema.js';
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from '../../common/utils/otp.utils.js';
import { sendOtpEmail } from '../../common/utils/email.service.js';
import { yearToDisplay } from '../../common/utils/year.js';
import { UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { createProfileSetupToken, createSession, invalidateUserSession } from '../../common/auth/session.js';
import { invalidateAllProviderSessions } from '../../common/auth/provider-session.js';

const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;

function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

const PASSWORD_RESET_MESSAGE = 'If an account exists with this email, you will receive instructions to reset your password.';
const PASSWORD_RESET_PURPOSE = 'password_reset';
const PASSWORD_RESET_TTL_SECONDS = 10 * 60;

function passwordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function incrementResetCounter(redis: Redis, key: string, limit: number) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, PASSWORD_RESET_TTL_SECONDS);
  if (count > limit) throw { statusCode: 429, message: 'Too many password reset attempts. Please try again later.' };
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

  async forgotPassword(input: ForgotPasswordInput) {
    const { email } = forgotPasswordSchema.parse(input);
    const user = await authRepository.findByEmail(email);
    if (!user || !user.role || ![UserRole.STUDENT, UserRole.PROVIDER].includes(user.role)) {
      return { message: PASSWORD_RESET_MESSAGE };
    }

    await authRepository.deleteChallengesByEmail(email, user.role);
    const otp = generateOtp();
    await authRepository.createChallenge({
      email,
      role: user.role,
      purpose: PASSWORD_RESET_PURPOSE,
      otpHash: hashOtp(otp),
      userId: user.id,
      expiresAt: passwordResetExpiry(),
    });
    await sendOtpEmail(email, otp, undefined, 'password-reset');
    return { message: PASSWORD_RESET_MESSAGE };
  },

  async verifyPasswordReset(input: VerifyPasswordResetInput, redis: Redis) {
    const { email, otp } = verifyPasswordResetSchema.parse(input);
    const attemptKey = `password-reset:verify:${email}`;
    await incrementResetCounter(redis, attemptKey, 5);

    const user = await authRepository.findByEmail(email);
    const challenge = user
      ? await authRepository.findActiveChallenge(email, user.role, PASSWORD_RESET_PURPOSE)
      : null;
    if (!challenge || !challenge.userId || !verifyOtpHash(otp, challenge.otpHash)) {
      throw { statusCode: 400, message: 'Invalid or expired reset code' };
    }

    const resetToken = crypto.randomBytes(32).toString('base64url');
    const publicResetToken = `${challenge.id}.${resetToken}`;
    const marked = await authRepository.markPasswordResetVerified(challenge.id, hashResetToken(publicResetToken));
    if (marked.count !== 1) throw { statusCode: 400, message: 'Invalid or expired reset code' };
    await redis.del(attemptKey);
    return { resetToken: publicResetToken, expiresInSeconds: PASSWORD_RESET_TTL_SECONDS };
  },

  async resetPassword(input: ResetPasswordInput, redis: Redis) {
    const data = resetPasswordSchema.parse(input);
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const [challengeId] = data.resetToken.split('.', 1);
    if (!challengeId) throw { statusCode: 400, message: 'Reset link is invalid or expired' };
    // The reset token itself is the secret; its hash is the only value stored
    // in PostgreSQL. The challenge row is atomically consumed on success.
    const result = await authRepository.consumePasswordReset(
      challengeId,
      hashResetToken(data.resetToken),
      passwordHash,
    );

    if (result.role === UserRole.PROVIDER) {
      await invalidateAllProviderSessions(redis, result.id);
    } else {
      await invalidateUserSession(redis, result.id);
    }
    return { message: 'Password updated successfully. Please log in again.' };
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
