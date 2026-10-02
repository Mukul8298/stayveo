// ─── Student Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';

async function assertPhoneAvailable(tx: Prisma.TransactionClient, userId: string, phone?: string) {
  if (!phone) return;
  const duplicate = await tx.user.findFirst({
    where: { phone_number: phone, id: { not: userId } },
    select: { id: true },
  });
  if (duplicate) throw { statusCode: 409, message: 'Phone number is already registered' };
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

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
    const { collegeId, collegeName, phone, ...profileData } = data;

    try {
      return await prisma.$transaction(async (tx) => {
        await assertPhoneAvailable(tx, userId, phone);
        if (collegeId || collegeName || phone) {
          // Verify the college FK exists before setting it — avoids P2003
          let validCollegeId: string | null = null;
          if (collegeId) {
            const college = await tx.college.findUnique({ where: { id: collegeId }, select: { id: true } });
            validCollegeId = college ? collegeId : null;
          }

          await tx.user.update({
            where: { id: userId },
            data: {
              ...(collegeId || collegeName ? {
                collegeId: validCollegeId,
                collegeName: collegeName || profileData.college,
              } : {}),
              ...(phone ? { phone_number: phone } : {}),
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
    } catch (error) {
      if (phone && isUniqueConflict(error)) throw { statusCode: 409, message: 'Phone number is already registered' };
      throw error;
    }
  },

  /** Update student profile */
  async update(userId: string, data: UpdateStudentInput) {
    const { collegeId, collegeName, phone, ...profileData } = data;

    try {
      return await prisma.$transaction(async (tx) => {
        await assertPhoneAvailable(tx, userId, phone);
        if (collegeId !== undefined || collegeName !== undefined || phone !== undefined) {
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
              ...(phone !== undefined ? { phone_number: phone } : {}),
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
    } catch (error) {
      if (phone && isUniqueConflict(error)) throw { statusCode: 409, message: 'Phone number is already registered' };
      throw error;
    }
  },
};
