// ─── Payment Zod Schemas ────────────────────────────────────────────────

import { z } from 'zod';

export const createPaymentSchema = z.object({
  booking_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  amount: z.number().min(0),
  type: z.enum(['rent', 'reservation', 'tiffin']),
  // Accept gateway terminology at the API boundary, then normalize it to the
  // existing database enum (PAID/PENDING/FAILED) in the repository.
  status: z.enum(['paid', 'success', 'captured', 'completed', 'pending', 'processing', 'failed']).default('pending'),
  payment_method: z.string().min(1).max(60).optional(),
  transaction_id: z.string().min(1).max(128).optional(),
  idempotency_key: z.string().min(8).max(128).optional(),
});

export const verifyPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  razorpay_order_id: z.string().min(1).max(128),
  razorpay_payment_id: z.string().min(1).max(128),
  razorpay_signature: z.string().min(1).max(256),
});

export const earningsFilterSchema = z.object({
  provider_id: z.string().uuid(),
  period: z.enum(['daily', 'weekly', 'monthly', 'all']).default('monthly'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type EarningsFilterInput = z.infer<typeof earningsFilterSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
