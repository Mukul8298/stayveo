// ─── Auth Repository ────────────────────────────────────────────────────
// All DB queries needed for the auth/onboarding flow

import prisma from '../../common/db/prisma.js';
import { UserRole } from '../../common/enums.js';

export const authRepository = {
  /** Find user by phone number */
  async findByPhone(phone_number: string) {
    return prisma.user.findUnique({
      where: { phone_number },
    });
  },

  /** Create a new user with STUDENT role */
  async createUser(phone_number: string) {
    return prisma.user.create({
      data: {
        phone_number,
        role: UserRole.STUDENT,
      },
    });
  },

  /** Find user by phone number WITH student profile included */
  async findByPhoneWithProfile(phone_number: string) {
    return prisma.user.findUnique({
      where: { phone_number },
      include: {
        studentProfile: true,
      },
    });
  },
};
