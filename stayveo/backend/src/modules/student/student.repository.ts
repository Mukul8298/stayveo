// ─── Student Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';

export const studentRepository = {
  /** Find student profile by user ID */
  async findByUserId(userId: string) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, phone_number: true, role: true, collegeId: true, collegeName: true } },
      },
    });
  },

  /** Create student profile linked to a user */
  async create(userId: string, data: CreateStudentInput) {
    const { collegeId, collegeName, ...profileData } = data;

    return prisma.$transaction(async (tx) => {
      if (collegeId || collegeName) {
        await tx.user.update({
          where: { id: userId },
          data: {
            collegeId: collegeId || null,
            collegeName: collegeName || profileData.college,
          },
        });
      }

      return tx.studentProfile.create({
        data: { ...profileData, userId },
        include: {
          user: { select: { id: true, phone_number: true, role: true, collegeId: true, collegeName: true } },
        },
      });
    });
  },

  /** Update student profile */
  async update(userId: string, data: UpdateStudentInput) {
    const { collegeId, collegeName, ...profileData } = data;

    return prisma.$transaction(async (tx) => {
      if (collegeId !== undefined || collegeName !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(collegeId !== undefined ? { collegeId } : {}),
            ...(collegeName !== undefined ? { collegeName } : {}),
          },
        });
      }

      return tx.studentProfile.update({
        where: { userId },
        data: profileData,
        include: {
          user: { select: { id: true, phone_number: true, role: true, collegeId: true, collegeName: true } },
        },
      });
    });
  },
};
