import { z } from 'zod';

export const tiffinPaymentActionSchema = z.object({
  paymentId: z.string().uuid('Choose a valid payment attempt').optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  // Optional values are accepted only to verify that a client cannot alter
  // the server-owned reservation amount or currency.
  amount: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
});

export type TiffinPaymentActionInput = z.infer<typeof tiffinPaymentActionSchema>;
