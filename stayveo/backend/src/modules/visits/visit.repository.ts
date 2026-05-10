// ─── Visit Repository ───────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { VisitStatus } from '@prisma/client';
import type { CreateVisitInput } from './visit.schema.js';

const VISIT_STATUS_MAP: Record<string, VisitStatus> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  completed: 'COMPLETED',
};

export const visitRepository = {
  /** Create a visit request */
  async create(userId: string, data: CreateVisitInput) {
    return prisma.visitRequest.create({
      data: {
        bookingId: data.booking_id,
        userId,
        providerId: data.provider_id,
        visitDate: new Date(data.visit_date),
        visitTime: data.visit_time,
        status: 'PENDING',
        instructions: data.instructions,
      },
    });
  },

  /** Find visit by ID */
  async findById(id: string) {
    return prisma.visitRequest.findUnique({
      where: { id },
      include: { booking: true },
    });
  },

  /** List visits for a provider */
  async findByProvider(providerId: string) {
    return prisma.visitRequest.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: { booking: true },
    });
  },

  /** List visits for a booking */
  async findByBooking(bookingId: string) {
    return prisma.visitRequest.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Update visit status */
  async updateStatus(id: string, status: string) {
    const prismaStatus = VISIT_STATUS_MAP[status] || status;
    return prisma.visitRequest.update({
      where: { id },
      data: { status: prismaStatus as VisitStatus },
    });
  },
};
