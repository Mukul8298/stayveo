// ─── Cleaning Zod Schemas ───────────────────────────────────────────────

import { z } from 'zod';

export const createCleaningSchema = z.object({
  service_type: z.enum(['BASIC', 'DEEP_CLEAN']).optional(),
  basic_price: z.number().min(0).optional(),
  deep_clean_price: z.number().min(0).optional(),
  staff_available: z.number().int().min(0).optional(),
  available_slots: z.array(z.string()).optional(),
  service_radius_km: z.number().min(0).max(100).optional(),
});

export const cleaningFilterSchema = z.object({
  service_type: z.enum(['BASIC', 'DEEP_CLEAN']).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCleaningInput = z.infer<typeof createCleaningSchema>;
export type CleaningFilterInput = z.infer<typeof cleaningFilterSchema>;
