import { Prisma } from '@prisma/client';
import prisma from '../../common/db/prisma.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let savedTableReady: Promise<void> | null = null;

function requireUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) {
    throw { statusCode: 400, message: `Invalid ${label}` };
  }
}

function normalizeDatabaseError(error: any): never {
  const message = String(error?.meta?.message || error?.message || '');
  const postgresCode = error?.meta?.code;

  if (error?.code === 'P2010') {
    if (postgresCode === '22P02' || message.includes('invalid input syntax')) {
      throw { statusCode: 400, message: 'Invalid user or room id' };
    }
    if (postgresCode === '23503' || message.includes('foreign key')) {
      throw { statusCode: 404, message: 'User or room not found' };
    }
    if (postgresCode === '42P01' || message.includes('does not exist')) {
      throw { statusCode: 500, message: 'Saved listings database table is not ready' };
    }
  }

  throw error;
}

async function ensureSavedTable() {
  if (!savedTableReady) {
    savedTableReady = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "saved_listings" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "user_id" UUID NOT NULL,
          "pg_id" UUID NOT NULL,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("id")
        )
      `;

      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "saved_listings_user_id_pg_id_key"
        ON "saved_listings"("user_id", "pg_id")
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "saved_listings_user_id_created_at_idx"
        ON "saved_listings"("user_id", "created_at")
      `;

      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'saved_listings_user_id_fkey'
          ) THEN
            ALTER TABLE "saved_listings"
              ADD CONSTRAINT "saved_listings_user_id_fkey"
              FOREIGN KEY ("user_id") REFERENCES "users"("id")
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'saved_listings_pg_id_fkey'
          ) THEN
            ALTER TABLE "saved_listings"
              ADD CONSTRAINT "saved_listings_pg_id_fkey"
              FOREIGN KEY ("pg_id") REFERENCES "pg_details"("id")
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    })().catch((error) => {
      savedTableReady = null;
      normalizeDatabaseError(error);
    });
  }

  await savedTableReady;
}

async function ensureSaveTargets(userId: string, pgId: string) {
  const [userRows, pgRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "users"
      WHERE "id" = ${userId}::uuid
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "pg_details"
      WHERE "id" = ${pgId}::uuid
      LIMIT 1
    `,
  ]);

  if (userRows.length === 0) {
    throw { statusCode: 401, message: 'User not found. Please login again.' };
  }
  if (pgRows.length === 0) {
    throw { statusCode: 404, message: 'Room not found' };
  }
}

function mapSavedRow(row: any) {
  const amenities = Array.isArray(row.amenities) ? row.amenities : [];
  const photos = Array.isArray(row.photos) ? row.photos : [];

  return {
    id: row.id,
    title: row.pg_name || 'PG Room',
    type: 'PG',
    price: row.min_price || 0,
    rating: 0,
    reviews: 0,
    verified: true,
    available: true,
    images: photos,
    roomType: row.room_type || 'shared',
    services: mapAmenities(amenities),
    amenities,
    address: row.address || 'Address not available',
    owner: row.owner_name || 'Property Owner',
    providerId: row.provider_id || null,
    providerPhone: row.provider_phone || null,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    description: `${row.pg_name || 'PG'} located at ${row.address || 'N/A'}. Contact owner for details.`,
    saved: true,
    savedAt: row.saved_at,
  };
}

function mapAmenities(amenities: string[]) {
  const lower = amenities.map((amenity) => (amenity || '').toLowerCase());
  const serviceKeys: string[] = [];
  if (lower.some((amenity) => amenity.includes('wifi') || amenity.includes('internet'))) serviceKeys.push('wifi');
  if (lower.some((amenity) => amenity.includes('food') || amenity.includes('meal') || amenity.includes('tiffin'))) serviceKeys.push('food');
  if (serviceKeys.length === 0) serviceKeys.push('wifi');
  return serviceKeys;
}

export const savedRepository = {
  async list(userId: string) {
    requireUuid(userId, 'user id');

    try {
      await ensureSavedTable();
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          pg.*,
          sl."created_at" AS saved_at,
          ps."provider_id" AS provider_id,
          pp."name" AS owner_name,
          pp."phone" AS provider_phone
        FROM "saved_listings" sl
        JOIN "pg_details" pg ON pg."id" = sl."pg_id"
        LEFT JOIN "provider_services" ps ON ps."id" = pg."service_id"
        LEFT JOIN "provider_profiles" pp ON pp."id" = ps."provider_id"
        WHERE sl."user_id" = ${userId}::uuid
        ORDER BY sl."created_at" DESC
      `;

      return rows.map(mapSavedRow);
    } catch (error) {
      normalizeDatabaseError(error);
    }
  },

  async ids(userId: string) {
    requireUuid(userId, 'user id');

    try {
      await ensureSavedTable();
      const rows = await prisma.$queryRaw<Array<{ pg_id: string }>>`
        SELECT "pg_id"
        FROM "saved_listings"
        WHERE "user_id" = ${userId}::uuid
      `;

      return rows.map((row) => row.pg_id);
    } catch (error) {
      normalizeDatabaseError(error);
    }
  },

  async save(userId: string, pgId: string) {
    requireUuid(userId, 'user id');
    requireUuid(pgId, 'room id');

    try {
      await ensureSavedTable();
      await ensureSaveTargets(userId, pgId);

      await prisma.$executeRaw`
        INSERT INTO "saved_listings" ("user_id", "pg_id")
        VALUES (${userId}::uuid, ${pgId}::uuid)
        ON CONFLICT ("user_id", "pg_id") DO NOTHING
      `;
    } catch (error) {
      normalizeDatabaseError(error);
    }

    return { roomId: pgId, saved: true };
  },

  async remove(userId: string, pgId: string) {
    requireUuid(userId, 'user id');
    requireUuid(pgId, 'room id');

    try {
      await ensureSavedTable();
      await prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM "saved_listings"
          WHERE "user_id" = ${userId}::uuid
            AND "pg_id" = ${pgId}::uuid
        `
      );
    } catch (error) {
      normalizeDatabaseError(error);
    }

    return { roomId: pgId, saved: false };
  },
};
