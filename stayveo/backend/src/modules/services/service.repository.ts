// ─── Service Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { ServiceCategory } from '../../common/enums.js';

export const serviceRepository = {
  /** Find all services for a provider */
  async findByProviderId(providerId: string) {
    return prisma.service.findMany({
      where: { providerId },
    });
  },

  /** Find a specific service for a provider */
  async findByProviderAndType(providerId: string, serviceType: ServiceCategory) {
    return prisma.service.findUnique({
      where: {
        providerId_serviceType: { providerId, serviceType },
      },
    });
  },

  /** Bulk-create services (upsert to prevent duplicates) */
  async createMany(providerId: string, serviceTypes: ServiceCategory[]) {
    return prisma.$transaction(
      serviceTypes.map((serviceType) =>
        prisma.service.upsert({
          where: {
            providerId_serviceType: { providerId, serviceType },
          },
          update: {},
          create: { providerId, serviceType },
        })
      )
    );
  },

  /** Find service by ID */
  async findById(id: string) {
    return prisma.service.findUnique({ where: { id } });
  },
};
