// ─── PG Room Zod Schemas ────────────────────────────────────────────────
// Matches the existing pg_rooms table

import { z } from 'zod';

export const createPGSchema = z.object({
  pg_name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  room_types: z.array(z.string()).optional(),     // ["single", "double", "triple"]
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),       // ["wifi", "ac", "food", "laundry"]
});

/** Query params for filtering PG listings */
export const pgFilterSchema = z.object({
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  amenities: z.string().optional(),                // comma-separated: "wifi,ac,food"
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).optional(), // km
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePGInput = z.infer<typeof createPGSchema>;
export type PGFilterInput = z.infer<typeof pgFilterSchema>;
