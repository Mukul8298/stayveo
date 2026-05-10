// ─── Booking Zod Schemas ────────────────────────────────────────────────

import { z } from 'zod';

export const createBookingSchema = z.object({
  provider_id: z.string().uuid(),
  room_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  room_type: z.string().optional(),
  booking_date: z.string(), // ISO date string
  booking_time: z.string(),
  price: z.number().min(0),
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
