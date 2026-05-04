// ─── Tiffin Repository ──────────────────────────────────────────────────
// Geo-search uses provider's lat/lng from the providers table.

import prisma from '../../common/db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CreateTiffinInput, TiffinFilterInput } from './tiffin.schema.js';

export const tiffinRepository = {
  /** Create a new tiffin service listing */
  async create(providerId: string, data: CreateTiffinInput) {
    return prisma.tiffinService.create({
      data: {
        provider_id: providerId,
        kitchen_name: data.kitchen_name,
        foodType: data.food_type,
        meal_options: data.meal_options ?? [],
        monthly_price: data.monthly_price,
        delivery_range_km: data.delivery_range_km,
        delivery_timing: data.delivery_timing,
      },
    });
  },

  /** Filtered listing with food_type, price, and geo proximity */
  async findFiltered(filters: TiffinFilterInput) {
    const { food_type, maxPrice, latitude, longitude, radius, page, limit } = filters;

    const conditions: Prisma.Sql[] = [];

    if (food_type) {
      conditions.push(Prisma.sql`t."food_type" = ${food_type}::"food_type"`);
    }
    if (maxPrice !== undefined) {
      conditions.push(Prisma.sql`t."monthly_price" <= ${maxPrice}`);
    }

    // Geo filter: use provider coordinates, filter by delivery_range or radius
    if (latitude !== undefined && longitude !== undefined) {
      const r = radius ?? 10;
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
      SELECT t.*, prov."business_name" as provider_name, prov."phone_number" as provider_phone
      FROM "tiffin_services" t
      JOIN "providers" prov ON t."provider_id" = prov."id"
      ${whereClause}
      ORDER BY t."created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "tiffin_services" t
      JOIN "providers" prov ON t."provider_id" = prov."id"
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
