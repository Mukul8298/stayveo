// ─── Cleaning Repository ────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CreateCleaningInput, CleaningFilterInput } from './cleaning.schema.js';

export const cleaningRepository = {
  /** Create a cleaning service listing */
  async create(providerId: string, data: CreateCleaningInput) {
    return prisma.cleaningService.create({
      data: {
        provider_id: providerId,
        service_type: data.service_type,
        basic_price: data.basic_price,
        deep_clean_price: data.deep_clean_price,
        staff_available: data.staff_available,
        available_slots: data.available_slots ?? [],
        service_radius_km: data.service_radius_km,
      },
    });
  },

  /** Filtered listing */
  async findFiltered(filters: CleaningFilterInput) {
    const { service_type, maxPrice, latitude, longitude, radius, page, limit } = filters;

    const conditions: Prisma.Sql[] = [];

    if (service_type) {
      conditions.push(Prisma.sql`c."service_type" = ${service_type}::"clean_type"`);
    }
    if (maxPrice !== undefined) {
      conditions.push(Prisma.sql`c."basic_price" <= ${maxPrice}`);
    }

    // Geo filter using provider coordinates
    if (latitude !== undefined && longitude !== undefined) {
      const r = radius ?? 5;
      conditions.push(Prisma.sql`
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(prov."latitude")) *
            cos(radians(prov."longitude") - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(prov."latitude"))
          ))
        )) <= ${r}
      `);
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const offset = (page - 1) * limit;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT c.*, prov."business_name" as provider_name, prov."phone_number" as provider_phone
      FROM "cleaning_services" c
      JOIN "providers" prov ON c."provider_id" = prov."id"
      ${whereClause}
      ORDER BY c."created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "cleaning_services" c
      JOIN "providers" prov ON c."provider_id" = prov."id"
      ${whereClause}
    `;

    return {
      items: rows,
      pagination: {
        page, limit,
        total: Number(countResult[0].count),
        totalPages: Math.ceil(Number(countResult[0].count) / limit),
      },
    };
  },
};
