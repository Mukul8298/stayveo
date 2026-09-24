import { z } from 'zod';

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const createTiffinReservationSchema = z.object({
  planId: z.string().uuid('Choose a valid meal plan'),
  deliveryAddress: z.string().trim().min(5, 'Delivery address is required').max(500),
  deliveryLatitude: z.number().finite().min(-90).max(90).nullable().optional(),
  deliveryLongitude: z.number().finite().min(-180).max(180).nullable().optional(),
  startDate: z.string().regex(dateOnly, 'Choose a valid start date').optional(),
  dietPreference: z.enum(['veg', 'nonveg', 'jain', 'both']).default('veg'),
  dietPreferences: z.array(z.enum(['veg', 'nonveg', 'jain'])).min(1).max(2).optional(),
  customInstructions: z.string().trim().max(1000).optional().or(z.literal('')),
  optedLunch: z.boolean().default(true),
  optedDinner: z.boolean().default(true),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export type CreateTiffinReservationInput = z.infer<typeof createTiffinReservationSchema>;
