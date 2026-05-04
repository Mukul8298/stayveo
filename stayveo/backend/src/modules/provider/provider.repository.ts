// ─── Provider Repository ────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import type { CreateProviderInput, UpdateProviderInput } from './provider.schema.js';

export const providerRepository = {
  /** Find provider by user ID */
  async findByUserId(userId: string) {
    return prisma.provider.findUnique({
      where: { userId },
      include: {
        services: true,
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Find provider by provider ID */
  async findById(id: string) {
    return prisma.provider.findUnique({
      where: { id },
      include: {
        services: true,
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Create provider profile */
  async create(userId: string, data: CreateProviderInput) {
    return prisma.provider.create({
      data: { ...data, userId },
      include: { services: true },
    });
  },

  /** Update provider */
  async update(id: string, data: UpdateProviderInput) {
    return prisma.provider.update({
      where: { id },
      data,
    });
  },
};
