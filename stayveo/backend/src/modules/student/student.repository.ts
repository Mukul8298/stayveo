// ─── Student Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';

export const studentRepository = {
  /** Find student profile by user ID */
  async findByUserId(userId: string) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Create student profile linked to a user */
  async create(userId: string, data: CreateStudentInput) {
    return prisma.studentProfile.create({
      data: { ...data, userId },
      include: {
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Update student profile */
  async update(userId: string, data: UpdateStudentInput) {
    return prisma.studentProfile.update({
      where: { userId },
      data,
      include: {
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },
};
