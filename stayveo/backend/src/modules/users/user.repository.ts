// ─── User Repository ────────────────────────────────────────────────────
// All Prisma queries for the users table
// ────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import type { CreateUserInput, UpdateUserInput } from './user.schema.js';
import type { Prisma } from '@prisma/client';

export const userRepository = {
  /** Find user by ID */
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /** Find user by phone number */
  async findByPhone(phone_number: string) {
    return prisma.user.findUnique({ where: { phone_number } });
  },

  /** Find user with all related profiles by phone number */
  async findWithProfileByPhone(phone_number: string) {
    return prisma.user.findUnique({
      where: { phone_number },
      include: {
        studentProfile: true,
        provider: true,
      },
    });
  },

  /** Create a new user */
  async create(data: CreateUserInput) {
    return prisma.user.create({ data });
  },

  /** Update user by ID */
  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data });
  },

  /** Find user with all related profiles */
  async findWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        provider: true,
      },
    });
  },

  /** Upsert student profile data using the phone number as the lookup key */
  async updateProfileByPhone(
    phone_number: string,
    data: Prisma.StudentProfileUncheckedCreateInput
  ) {
    const { userId: _userId, ...profileData } = data;

    return prisma.user.update({
      where: { phone_number },
      data: {
        studentProfile: {
          upsert: {
            create: profileData,
            update: profileData,
          },
        },
      },
      include: {
        studentProfile: true,
        provider: true,
      },
    });
  },
};
