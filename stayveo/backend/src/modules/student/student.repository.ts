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
        // Verify the college FK exists before setting it — avoids P2003
        let validCollegeId: string | null = null;
        if (collegeId) {
          const college = await tx.college.findUnique({ where: { id: collegeId }, select: { id: true } });
          validCollegeId = college ? collegeId : null;
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            collegeId: validCollegeId,
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
        // Verify the college FK exists before setting it — avoids P2003
        let validCollegeId: string | null | undefined = undefined;
        if (collegeId !== undefined) {
          if (collegeId) {
            const college = await tx.college.findUnique({ where: { id: collegeId }, select: { id: true } });
            validCollegeId = college ? collegeId : null;
          } else {
            validCollegeId = null;
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            ...(validCollegeId !== undefined ? { collegeId: validCollegeId } : {}),
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
