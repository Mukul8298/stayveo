// ─── Visit Request Zod Schemas ──────────────────────────────────────────

import { z } from 'zod';

export const createVisitSchema = z.object({
  booking_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  visit_date: z.string(), // ISO date string
  visit_time: z.string(),
  instructions: z.string().optional(),
});

export const updateVisitStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'completed']),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>;
