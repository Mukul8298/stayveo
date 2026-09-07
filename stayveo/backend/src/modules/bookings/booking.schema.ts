// ─── Booking Zod Schemas ────────────────────────────────────────────────

import { z } from 'zod';

const visitDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be a valid date.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Visit date must be a valid date.')
  .refine((value) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return new Date(`${value}T00:00:00.000Z`) >= today;
  }, 'Visit date cannot be in the past.');

export const createBookingSchema = z.object({
  provider_id: z.string().uuid(),
  room_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  room_type: z.string().optional(),
  booking_date: z.string(), // ISO date string
  booking_time: z.string(),
  price: z.number().min(0),
  monthly_rent: z.number().min(0).optional(),
  security_deposit: z.number().min(0).optional(),
  reservation_fee: z.number().min(0).optional(),
  platform_fee: z.number().min(0).optional(),
  minimum_stay_months: z.number().int().min(1).optional(),
  number_of_beds: z.number().int().min(1).optional(),
  food_charges: z.number().min(0).optional(),
  electricity_charges: z.number().min(0).optional(),
  water_charges: z.number().min(0).optional(),
  maintenance_charges: z.number().min(0).optional(),
  parking_charges: z.number().min(0).optional(),
  other_charges: z.number().min(0).optional(),
  move_in_date: visitDateSchema.optional(),
  student_name: z.string().optional(),
  student_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['new', 'accepted', 'in_progress', 'completed', 'rejected']),
});

export const bookingFilterSchema = z.object({
  status: z.enum(['new', 'accepted', 'in_progress', 'completed', 'rejected']).optional(),
  provider_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;
