// ─── Laundry Repository ─────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CreateLaundryInput, LaundryFilterInput } from './laundry.schema.js';

export const laundryRepository = {
  /** Create a laundry service listing */
  async create(providerId: string, data: CreateLaundryInput) {
    return prisma.laundryService.create({
      data: {
        provider_id: providerId,
        pricing_model: data.pricing_model,
        price: data.price,
        pickup_frequency: data.pickup_frequency,
        delivery_time: data.delivery_time,
        service_radius_km: data.service_radius_km,
      },
    });
  },

  /** Filtered listing */
  async findFiltered(filters: LaundryFilterInput) {
    const { maxPrice, pricing_model, latitude, longitude, radius, page, limit } = filters;

    const conditions: Prisma.Sql[] = [];

    if (maxPrice !== undefined) {
      conditions.push(Prisma.sql`l."price" <= ${maxPrice}`);
    }
    if (pricing_model) {
      conditions.push(Prisma.sql`l."pricing_model" = ${pricing_model}::"pricing_model"`);
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
      SELECT l.*, prov."business_name" as provider_name, prov."phone_number" as provider_phone
      FROM "laundry_services" l
      JOIN "providers" prov ON l."provider_id" = prov."id"
      ${whereClause}
      ORDER BY l."created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "laundry_services" l
      JOIN "providers" prov ON l."provider_id" = prov."id"
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
