// ─── Tiffin Zod Schemas ─────────────────────────────────────────────────

import { z } from 'zod';

export const createTiffinSchema = z.object({
  kitchen_name: z.string().min(1).max(200),
  food_type: z.enum(['VEG', 'NONVEG', 'JAIN', 'VEGAN']).optional(),
  meal_options: z.array(z.string()).optional(),
  monthly_price: z.number().min(0).optional(),
  delivery_range_km: z.number().min(0).max(50).optional(),
  delivery_timing: z.string().max(200).optional(),
});

export const tiffinFilterSchema = z.object({
  food_type: z.enum(['VEG', 'NONVEG', 'JAIN', 'VEGAN']).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTiffinInput = z.infer<typeof createTiffinSchema>;
export type TiffinFilterInput = z.infer<typeof tiffinFilterSchema>;
