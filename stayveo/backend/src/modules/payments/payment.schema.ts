// ─── Payment Zod Schemas ────────────────────────────────────────────────

import { z } from 'zod';

export const createPaymentSchema = z.object({
  booking_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  amount: z.number().min(0),
  type: z.enum(['rent', 'laundry', 'cleaning', 'tiffin']),
  status: z.enum(['paid', 'pending']).default('pending'),
});

export const earningsFilterSchema = z.object({
  provider_id: z.string().uuid(),
  period: z.enum(['daily', 'weekly', 'monthly', 'all']).default('monthly'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type EarningsFilterInput = z.infer<typeof earningsFilterSchema>;
