// ─── Auth Repository ────────────────────────────────────────────────────
// All DB queries for email-based authentication and OTP challenges.
// ────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import type { UserRole } from '@prisma/client';

// ── User Queries ────────────────────────────────────────────────────────

export const authRepository = {
  /** Find user by normalized email */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /** Find user by email WITH student profile included */
  async findByEmailWithProfile(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: {
          select: {
            id: true,
            fullName: true,
            college: true,
            year: true,
            gender: true,
            foodPreference: true,
            sleepSchedule: true,
            cleanlinessLevel: true,
            studyHabits: true,
            personalityType: true,
            locationPreference: true,
            budget: true,
            profileImageUrl: true,
          },
        },
      },
    });
  },

  /** Find the current user for a validated session without selecting secrets. */
  async findByIdWithProfiles(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone_number: true,
        role: true,
        collegeId: true,
        collegeName: true,
        studentProfile: true,
        providerProfile: {
          include: {
            services: { select: { type: true } },
          },
        },
        provider: true,
      },
    });
  },

  /** Create a new user with email, hashed password, and role */
  async createUser(email: string, passwordHash: string, role: UserRole) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
  },

  // ── Challenge Queries ───────────────────────────────────────────────────

  /** Create a pending OTP challenge */
  async createChallenge(data: {
    email: string;
    role: UserRole;
    purpose: string;
    otpHash: string;
    passwordHash?: string;
    userId?: string;
    expiresAt: Date;
  }) {
    return prisma.emailAuthChallenge.create({
      data: {
        email: data.email,
        role: data.role,
        purpose: data.purpose,
        otpHash: data.otpHash,
        passwordHash: data.passwordHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  },

  /** Find the most recent non-expired challenge for email + role + purpose */
  async findActiveChallenge(email: string, role: UserRole, purpose?: string) {
    const where: Record<string, unknown> = {
      email,
      role,
      expiresAt: { gt: new Date() },
    };
    if (purpose) {
      where.purpose = purpose;
      if (purpose === 'password_reset') where.verifiedAt = null;
    }

    return prisma.emailAuthChallenge.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Delete a single challenge by ID */
  async deleteChallenge(id: string) {
    return prisma.emailAuthChallenge.delete({ where: { id } });
  },

  /** Delete all challenges for a given email + role (cleanup before new OTP) */
  async deleteChallengesByEmail(email: string, role: UserRole) {
    return prisma.emailAuthChallenge.deleteMany({
      where: { email, role },
    });
  },

  async markPasswordResetVerified(id: string, resetTokenHash: string) {
    return prisma.emailAuthChallenge.updateMany({
      where: { id, purpose: 'password_reset', verifiedAt: null },
      data: { verifiedAt: new Date(), resetTokenHash },
    });
  },

  async consumePasswordReset(id: string, resetTokenHash: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      const challenge = await tx.emailAuthChallenge.findFirst({
        where: {
          id,
          purpose: 'password_reset',
          resetTokenHash,
          verifiedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
        select: { userId: true },
      });

      if (!challenge?.userId) {
        throw { statusCode: 400, message: 'Reset link is invalid or expired' };
      }

      const consumed = await tx.emailAuthChallenge.deleteMany({
        where: {
          id,
          purpose: 'password_reset',
          resetTokenHash,
          verifiedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) {
        throw { statusCode: 400, message: 'Reset link is invalid or expired' };
      }

      return tx.user.update({
        where: { id: challenge.userId },
        data: { passwordHash },
        select: { id: true, role: true },
      });
    });
  },
};
