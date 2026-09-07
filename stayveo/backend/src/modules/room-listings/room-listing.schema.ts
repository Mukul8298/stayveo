// ─── Room Listing Zod Schemas ────────────────────────────────────────────
// Validates all data entering the room inventory system.
//
// WHY separate create vs update schemas?
// - createRoomListingSchema requires all mandatory fields
// - updateRoomListingSchema makes everything optional (PATCH-style)
//   so providers can update just the price without re-sending images.
// ─────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const ROOM_TYPES  = ['Single', 'Double', 'Triple', '4-Bed Dorm', 'AC Room', 'Non-AC Room'] as const;
const GENDER_PREFS = ['boys', 'girls', 'unisex'] as const;
const AMENITY_LIST = ['WiFi', 'AC', 'Food', 'Geyser', 'Parking', 'CCTV', 'Study Table', 'Power Backup'] as const;

export const createRoomListingSchema = z.object({
  title:           z.string().min(1).max(200),
  description:     z.string().max(2000).optional().nullable(),
  address:         z.string().max(500).optional().nullable(),
  roomType:        z.string().min(1).max(100),           // free-text or from ROOM_TYPES
  genderPreference: z.enum(GENDER_PREFS).default('unisex'),
  price:           z.number().min(0),
  securityDeposit: z.number().min(0),
  reservationFee:  z.number().min(0),
  minimumStayMonths: z.number().int().min(1).max(60),
  numberOfBeds: z.number().int().min(1).max(100),
  platformFee: z.number().min(0).default(0),
  foodCharges: z.number().min(0).default(0),
  electricityCharges: z.number().min(0).default(0),
  waterCharges: z.number().min(0).default(0),
  maintenanceCharges: z.number().min(0).default(0),
  parkingCharges: z.number().min(0).default(0),
  otherCharges: z.number().min(0).default(0),
  totalBeds:       z.number().int().min(1).max(100),
  availableBeds:   z.number().int().min(0).max(100),
  reservedBeds:    z.number().int().min(0).max(100).default(0),
  occupiedBeds:    z.number().int().min(0).max(100).default(0),
  blockedBeds:     z.number().int().min(0).max(100).default(0),
  offlineBeds:     z.number().int().min(0).max(100).default(0),
  floor:           z.number().int().optional().nullable(),
  amenities:       z.array(z.string()).default([]),
  images:          z.array(z.string().url()).default([]),
  isActive:        z.boolean().default(true),
});

// Update allows any subset of fields — nothing is required.
export const updateRoomListingSchema = createRoomListingSchema.partial();

// Toggle just flips isActive.
// The service layer then derives the correct status.
export const toggleRoomListingSchema = z.object({
  isActive: z.boolean(),
});

export type CreateRoomListingInput = z.infer<typeof createRoomListingSchema>;
export type UpdateRoomListingInput = z.infer<typeof updateRoomListingSchema>;
export type ToggleRoomListingInput = z.infer<typeof toggleRoomListingSchema>;

export { ROOM_TYPES, GENDER_PREFS, AMENITY_LIST };
