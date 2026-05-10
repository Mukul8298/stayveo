// ─── Profile View Repository ────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';

export const profileViewRepository = {
  /** Record a profile view */
  async record(providerId: string, viewerId?: string) {
    return prisma.profileView.create({
      data: { providerId, viewerId },
    });
  },

  /** Count total profile views for a provider */
  async countByProvider(providerId: string) {
    return prisma.profileView.count({
      where: { providerId },
    });
  },

  /** Count unique viewers */
  async countUniqueViewers(providerId: string) {
    const result = await prisma.profileView.findMany({
      where: { providerId, viewerId: { not: null } },
      distinct: ['viewerId'],
      select: { viewerId: true },
    });
    return result.length;
  },

  /** Get recent views */
  async getRecent(providerId: string, take = 10) {
    return prisma.profileView.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },
};
