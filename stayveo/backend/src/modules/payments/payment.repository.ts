// ─── Payment Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { PaymentType, PaymentStatus } from '@prisma/client';
import type { CreatePaymentInput } from './payment.schema.js';

const TYPE_MAP: Record<string, PaymentType> = {
  rent: 'RENT',
  laundry: 'LAUNDRY',
  cleaning: 'CLEANING',
  tiffin: 'TIFFIN',
};

const STATUS_MAP: Record<string, PaymentStatus> = {
  paid: 'PAID',
  pending: 'PENDING',
};

export const paymentRepository = {
  /** Create a payment record */
  async create(data: CreatePaymentInput) {
    return prisma.payment.create({
      data: {
        bookingId: data.booking_id,
        userId: data.user_id,
        providerId: data.provider_id,
        amount: data.amount,
        type: TYPE_MAP[data.type] || data.type as PaymentType,
        status: STATUS_MAP[data.status || 'pending'] || 'PENDING',
      },
    });
  },

  /** List payments for a provider */
  async findByProvider(providerId: string) {
    return prisma.payment.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Get earnings summary for a provider */
  async getEarnings(providerId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [allPaid, today, thisWeek, thisMonth, lastMonth, byType] = await Promise.all([
      // Total paid earnings
      prisma.payment.aggregate({
        where: { providerId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      // Today's earnings
      prisma.payment.aggregate({
        where: { providerId, status: 'PAID', createdAt: { gte: startOfDay } },
        _sum: { amount: true },
        _count: true,
      }),
      // This week
      prisma.payment.aggregate({
        where: { providerId, status: 'PAID', createdAt: { gte: startOfWeek } },
        _sum: { amount: true },
        _count: true,
      }),
      // This month
      prisma.payment.aggregate({
        where: { providerId, status: 'PAID', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      // Last month
      prisma.payment.aggregate({
        where: {
          providerId, status: 'PAID',
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Breakdown by type
      prisma.payment.groupBy({
        by: ['type'],
        where: { providerId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Recent payments (last 10)
    const recentPayments = await prisma.payment.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      total: Number(allPaid._sum.amount || 0),
      totalOrders: allPaid._count,
      today: Number(today._sum.amount || 0),
      todayOrders: today._count,
      thisWeek: Number(thisWeek._sum.amount || 0),
      thisWeekOrders: thisWeek._count,
      thisMonth: Number(thisMonth._sum.amount || 0),
      thisMonthOrders: thisMonth._count,
      lastMonth: Number(lastMonth._sum.amount || 0),
      lastMonthOrders: lastMonth._count,
      byType: byType.map(t => ({
        type: t.type,
        total: Number(t._sum.amount || 0),
        count: t._count,
      })),
      recentPayments,
    };
  },
};
