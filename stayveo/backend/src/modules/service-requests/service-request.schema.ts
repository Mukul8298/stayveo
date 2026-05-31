import { z } from 'zod';

const serviceTypeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['laundry', 'cleaning'])
);

export const createServiceRequestSchema = z.object({
  providerId: z.string().uuid(),
  providerName: z.string().max(200).optional().or(z.literal('')),
  serviceId: z.string().uuid(),
  serviceType: serviceTypeSchema,
  studentAddress: z.string().max(1000).optional().or(z.literal('')),
  studentLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  studentLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  providerLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  providerLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  studentPhone: z.string().max(15).optional().or(z.literal('')),
});

export const serviceRequestFilterSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'completed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const acceptServiceRequestSchema = z.object({
  selectedDate: z.string().min(1),
  selectedTime: z.string().min(1).max(80),
  estimatedArrival: z.string().max(120).optional().or(z.literal('')),
});

export const declineServiceRequestSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type ServiceRequestFilterInput = z.infer<typeof serviceRequestFilterSchema>;
export type AcceptServiceRequestInput = z.infer<typeof acceptServiceRequestSchema>;
export type DeclineServiceRequestInput = z.infer<typeof declineServiceRequestSchema>;
