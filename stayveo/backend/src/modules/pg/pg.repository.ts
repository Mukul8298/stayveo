// ─── PG Repository ──────────────────────────────────────────────────────
// Handles all Prisma queries for pg_rooms table.
// Includes raw SQL for JSONB amenity filtering.
// Geo-search uses provider's lat/lng from the providers table.
// ────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CreatePGInput, PGFilterInput } from './pg.schema.js';

export const pgRepository = {
  /** Create a new PG room listing */
  async create(providerId: string, data: CreatePGInput) {
    return prisma.pGRoom.create({
      data: {
        provider_id: providerId,
        pg_name: data.pg_name,
        address: data.address,
        room_types: data.room_types ?? [],
        min_price: data.min_price,
        max_price: data.max_price,
        amenities: data.amenities ?? [],
      },
    });
  },

  /** Find PG by ID with provider info */
  async findById(id: string) {
    return prisma.pGRoom.findUnique({ where: { id } });
  },

  /**
   * Advanced filtered listing with:
   * - Price range filtering on min_price / max_price
   * - JSONB amenity @> contains check
   * - Haversine geo-distance filtering (uses provider.latitude/longitude)
   * - Pagination
   */
  async findFiltered(filters: PGFilterInput) {
    const {
      minPrice, maxPrice, amenities,
      latitude, longitude, radius,
      page, limit,
    } = filters;

    // ── Build WHERE conditions dynamically ────────────────────────────
    const conditions: Prisma.Sql[] = [];

    if (minPrice !== undefined) {
      conditions.push(Prisma.sql`p."min_price" >= ${minPrice}`);
    }
    if (maxPrice !== undefined) {
      conditions.push(Prisma.sql`p."max_price" <= ${maxPrice}`);
    }

    // ── JSONB amenity filter ──────────────────────────────────────────
    // Check that the amenities JSONB array contains ALL requested amenities
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim().toLowerCase());
      for (const amenity of amenityList) {
        conditions.push(Prisma.sql`p."amenities" @> ${JSON.stringify([amenity])}::jsonb`);
      }
    }

    // ── Haversine geo-distance filter (uses provider's lat/lng) ──────
    let distanceSelect = Prisma.sql`NULL as distance_km`;
    if (latitude !== undefined && longitude !== undefined) {
      distanceSelect = Prisma.sql`
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(prov."latitude")) *
            cos(radians(prov."longitude") - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(prov."latitude"))
          ))
        )) as distance_km`;

      if (radius !== undefined) {
        conditions.push(Prisma.sql`
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${latitude})) * cos(radians(prov."latitude")) *
              cos(radians(prov."longitude") - radians(${longitude})) +
              sin(radians(${latitude})) * sin(radians(prov."latitude"))
            ))
          )) <= ${radius}
        `);
      }
    }

    // ── Combine WHERE clause ──────────────────────────────────────────
    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    // ── Order by distance if geo params provided, else by created_at ──
    const orderBy =
      latitude !== undefined && longitude !== undefined
        ? Prisma.sql`ORDER BY distance_km ASC NULLS LAST`
        : Prisma.sql`ORDER BY p."created_at" DESC`;

    const offset = (page - 1) * limit;

    // ── Execute query ─────────────────────────────────────────────────
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        p.*,
        ${distanceSelect},
        prov."business_name" as provider_name,
        prov."name" as provider_contact_name,
        prov."phone_number" as provider_phone
      FROM "pg_rooms" p
      JOIN "providers" prov ON p."provider_id" = prov."id"
      ${whereClause}
      ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    // ── Count total for pagination ────────────────────────────────────
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "pg_rooms" p
      JOIN "providers" prov ON p."provider_id" = prov."id"
      ${whereClause}
    `;

    const total = Number(countResult[0].count);

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
