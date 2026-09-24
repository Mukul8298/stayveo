import type Redis from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import prisma from '../../common/db/prisma.js';
import { bookingRepository } from '../bookings/booking.repository.js';
import { profileViewService } from '../profile-views/profile-view.service.js';
import { providerRepository } from './provider.repository.js';
import {
  pgProviderDashboardKey,
  readProviderDashboardCache,
  writeProviderDashboardCache,
} from '../../common/cache/provider-dashboard.js';

interface CachedPgDashboard {
  activeListings: number;
  bookings: {
    total: number;
    new: number;
    accepted: number;
    confirmed: number;
    in_progress: number;
    completed: number;
  };
  profileViews: { total: number; unique: number };
}

export const providerDashboardService = {
  /**
   * Cache only non-financial PG dashboard summary data. Revenue is read from
   * PostgreSQL on every request so Redis never becomes its source of truth.
   */
  async getPgDashboard(redis: Redis, logger: FastifyBaseLogger, userId: string) {
    const profile = await providerRepository.findOnboardingByUserId(userId);
    if (!profile) throw { statusCode: 404, message: 'Provider profile not found' };

    const legacyProvider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });
    const providerIds = [profile.id, legacyProvider?.id].filter(Boolean) as string[];
    const key = pgProviderDashboardKey(profile.id);
    let cached = await readProviderDashboardCache<CachedPgDashboard>(redis, key, logger);
    if (
      !cached ||
      typeof cached.activeListings !== 'number' ||
      !cached.bookings ||
      typeof cached.bookings.total !== 'number' ||
      !cached.profileViews ||
      typeof cached.profileViews.total !== 'number'
    ) {
      cached = null;
    }

    if (!cached) {
      const [activeListings, bookings, totalViews, uniqueViews] = await Promise.all([
        prisma.providerService.count({ where: { providerId: profile.id } }),
        bookingRepository.countSummaryByProvider(providerIds),
        profileViewService.getCount(profile.id),
        profileViewService.getUniqueCount(profile.id),
      ]);

      cached = {
        activeListings,
        bookings,
        profileViews: { total: totalViews, unique: uniqueViews },
      };
      await writeProviderDashboardCache(redis, key, cached, logger);
    }

    const [thisMonthRevenue, totalEarningsResult] = await Promise.all([
      bookingRepository.monthlyRevenueByProvider(providerIds),
      prisma.payment.aggregate({
        where: { providerId: profile.id, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);
    return {
      activeListings: cached.activeListings,
      bookings: { ...cached.bookings, thisMonthRevenue },
      profileViews: cached.profileViews,
      // Kept in the response shape expected by the existing frontend. The
      // value is intentionally live, never read from the Redis cache.
      earnings: { thisMonth: thisMonthRevenue },
      totalEarnings: Number(totalEarningsResult._sum.amount || 0),
      providerId: profile.id,
    };
  },
};
