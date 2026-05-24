import prisma from '../../common/db/prisma.js';
import type { CollegeQueryInput } from './college.schema.js';

export const collegeRepository = {
  async findMany(query: CollegeQueryInput) {
    const { search, page, limit } = query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { university: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.college.findMany({
        where,
        select: {
          id: true,
          name: true,
          city: true,
          university: true,
          latitude: true,
          longitude: true,
        },
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.college.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: string) {
    return prisma.college.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        city: true,
        university: true,
        latitude: true,
        longitude: true,
      },
    });
  },
};
