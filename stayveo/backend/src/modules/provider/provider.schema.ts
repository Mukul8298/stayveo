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

export const phoneSchema = z.string().min(10).max(15);
export const serviceTypeSchema = z.enum(['PG', 'TIFFIN', 'LAUNDRY', 'CLEANING']);

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(4),
});

export const basicInfoSchema = z.object({
  name: z.string().min(1).max(200),
  phone: phoneSchema,
  email: z.string().email().optional(),
});

export const serviceSelectionSchema = z.object({
  phone: phoneSchema.optional(),
  services: z.array(serviceTypeSchema).min(1),
});

export const pgDetailsSchema = z.object({
  pgName: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  roomType: z.string().min(1).max(100),
  minPrice: z.coerce.number().min(0),
  amenities: z.array(z.string().min(1)).default([]),
  photos: z.array(z.string().url()).default([]),
});

export const tiffinDetailsSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.coerce.number().min(0),
  mealsPerDay: z.coerce.number().int().min(1).max(6),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photos: z.array(z.string().url()).default([]),
});

export const laundryDetailsSchema = z.object({
  pricing: z.string().min(1).max(500),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photos: z.array(z.string().url()).default([]),
});

export const cleaningDetailsSchema = z.object({
  pricing: z.string().min(1).max(500),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photos: z.array(z.string().url()).default([]),
});

export const serviceDetailsSchema = z.discriminatedUnion('type', [
  z.object({
    phone: phoneSchema.optional(),
    type: z.literal('PG'),
    data: pgDetailsSchema,
  }),
  z.object({
    phone: phoneSchema.optional(),
    type: z.literal('TIFFIN'),
    data: tiffinDetailsSchema,
  }),
  z.object({
    phone: phoneSchema.optional(),
    type: z.literal('LAUNDRY'),
    data: laundryDetailsSchema,
  }),
  z.object({
    phone: phoneSchema.optional(),
    type: z.literal('CLEANING'),
    data: cleaningDetailsSchema,
  }),
]);

export const photoUploadSchema = z.object({
  phone: phoneSchema.optional(),
  type: serviceTypeSchema,
  photos: z.array(z.string().url()).min(1),
});

export const verifyIdSchema = z.object({
  phone: phoneSchema.optional(),
  idType: z.enum(['AADHAR', 'PAN']),
  idNumber: z.string().min(4).max(30),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type ServiceSelectionInput = z.infer<typeof serviceSelectionSchema>;
export type ServiceDetailsInput = z.infer<typeof serviceDetailsSchema>;
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
export type VerifyIdInput = z.infer<typeof verifyIdSchema>;
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;

// ── Business Details update (provider self-edits from profile page) ──────
// Only the fields a provider can change themselves. No phone — that is
// the immutable identity key used to look up the record.
export const updateBusinessDetailsSchema = z.object({
  name:          z.string().min(1).max(200).optional(),
  email:         z.string().email().optional().nullable(),
  businessName:  z.string().min(1).max(200).optional().nullable(),
  address:       z.string().min(1).max(500).optional().nullable(),
  contactNumber: z.string().min(10).max(20).optional().nullable(),
  description:   z.string().max(1000).optional().nullable(),
});

export type UpdateBusinessDetailsInput = z.infer<typeof updateBusinessDetailsSchema>;
