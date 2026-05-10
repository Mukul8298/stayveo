// ─── Booking Repository ─────────────────────────────────────────────────
// Handles all Prisma queries for bookings table.
// ────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { BookingStatus } from '@prisma/client';
import type { CreateBookingInput, BookingFilterInput } from './booking.schema.js';

// Map lowercase status strings to Prisma enum values
const STATUS_MAP: Record<string, BookingStatus> = {
  new: 'NEW',
  accepted: 'ACCEPTED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  rejected: 'REJECTED',
};

export const bookingRepository = {
  /** Create a new booking */
  async create(userId: string, data: CreateBookingInput) {
    return prisma.booking.create({
      data: {
        userId,
        providerId: data.provider_id,
        roomId: data.room_id,
        serviceType: data.service_type,
        roomType: data.room_type,
        status: 'NEW',
        bookingDate: new Date(data.booking_date),
        bookingTime: data.booking_time,
        price: data.price,
        studentName: data.student_name,
        studentPhone: data.student_phone,
        notes: data.notes,
      },
    });
  },

  /** Find booking by ID */
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: { visitRequests: true, payments: true },
    });
  },

  /** List bookings for a provider with optional status filter */
  async findByProvider(providerId: string, filters: BookingFilterInput) {
    const where: any = { providerId };
    if (filters.status) {
      where.status = STATUS_MAP[filters.status] || filters.status;
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: { visitRequests: true },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  /** List bookings for a student */
  async findByUser(userId: string, filters: BookingFilterInput) {
    const where: any = { userId };
    if (filters.status) {
      where.status = STATUS_MAP[filters.status] || filters.status;
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  /** Update booking status */
  async updateStatus(id: string, status: string) {
    const prismaStatus = STATUS_MAP[status] || status;
    return prisma.booking.update({
      where: { id },
      data: { status: prismaStatus as BookingStatus },
    });
  },

  /** Count bookings for a provider (for dashboard stats) */
  async countByProvider(providerId: string) {
    const [total, newCount, acceptedCount, inProgressCount, completedCount] = await Promise.all([
      prisma.booking.count({ where: { providerId } }),
      prisma.booking.count({ where: { providerId, status: 'NEW' } }),
      prisma.booking.count({ where: { providerId, status: 'ACCEPTED' } }),
      prisma.booking.count({ where: { providerId, status: 'IN_PROGRESS' } }),
      prisma.booking.count({ where: { providerId, status: 'COMPLETED' } }),
    ]);
    return { total, new: newCount, accepted: acceptedCount, in_progress: inProgressCount, completed: completedCount };
  },
};
