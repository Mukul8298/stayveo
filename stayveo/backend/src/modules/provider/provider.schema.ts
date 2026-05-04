// ─── Provider Zod Schemas ───────────────────────────────────────────────
// Matches the existing providers table

import { z } from 'zod';

export const createProviderSchema = z.object({
  name: z.string().min(1).max(200),
  businessName: z.string().min(1).max(200),
  phone_number: z.string().min(10).max(15),
  location: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  service_radius_km: z.number().min(0).max(100).optional(),
});

export const updateProviderSchema = createProviderSchema.partial();

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
