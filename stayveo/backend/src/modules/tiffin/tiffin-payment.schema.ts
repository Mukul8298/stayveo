import { z } from 'zod';

export const tiffinPaymentActionSchema = z.object({
  paymentId: z.string().uuid('Choose a valid payment attempt').optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  // Optional values are accepted only to verify that a client cannot alter
  // the server-owned reservation amount or currency.
  amount: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  razorpayOrderId: z.string().min(1).max(128).optional(),
  razorpayPaymentId: z.string().min(1).max(128).optional(),
  razorpaySignature: z.string().min(1).max(256).optional(),
});

export type TiffinPaymentActionInput = z.infer<typeof tiffinPaymentActionSchema>;
