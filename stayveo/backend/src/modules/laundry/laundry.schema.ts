// ─── Laundry Zod Schemas ────────────────────────────────────────────────

import { z } from 'zod';

export const createLaundrySchema = z.object({
  pricing_model: z.enum(['PER_KG', 'PER_ITEM']).optional(),
  price: z.number().min(0).optional(),
  pickup_frequency: z.string().max(200).optional(),
  delivery_time: z.string().max(200).optional(),
  service_radius_km: z.number().min(0).max(100).optional(),
});

export const laundryFilterSchema = z.object({
  maxPrice: z.coerce.number().min(0).optional(),
  pricing_model: z.enum(['PER_KG', 'PER_ITEM']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLaundryInput = z.infer<typeof createLaundrySchema>;
export type LaundryFilterInput = z.infer<typeof laundryFilterSchema>;
