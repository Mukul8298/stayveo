// ─── Room Listing Service ─────────────────────────────────────────────────
// Business logic layer — sits between controller and repository.
//
// RESPONSIBILITIES:
//   1. Validate inputs with Zod (schema.parse throws on bad data)
//   2. Resolve phone → providerId (identity mapping)
//   3. Guard ownership — providers can only edit THEIR rooms
//   4. Delegate actual DB operations to repository
//
// WHY ownership guards matter:
//   Without "does this listing belong to this provider?" check,
//   Provider A could edit Provider B's rooms by guessing their UUID.
//   This is an IDOR (Insecure Direct Object Reference) vulnerability —
//   one of the OWASP Top 10. Always check ownership server-side.
// ─────────────────────────────────────────────────────────────────────────

import { roomListingRepository } from './room-listing.repository.js';
import { providerRepository } from '../provider/provider.repository.js';
import {
  createRoomListingSchema,
  updateRoomListingSchema,
} from './room-listing.schema.js';
import type { CreateRoomListingInput, UpdateRoomListingInput } from './room-listing.schema.js';

export const roomListingService = {
  /**
   * Resolve phone → providerProfile.id
   * Used at the top of every service method.
   * The provider is identified by phone (from the header) in this app.
   */
  async resolveProvider(phone: string) {
    const profile = await providerRepository.findOnboardingByPhone(phone);
    if (!profile) throw { statusCode: 404, message: 'Provider not found' };
    return profile;
  },

  /** Guard: listing must exist AND belong to this provider */
  async assertOwnership(listingId: string, providerId: string) {
    const listing = await roomListingRepository.findById(listingId);
    if (!listing) throw { statusCode: 404, message: 'Listing not found' };
    if (listing.providerId !== providerId) {
      // This is an authorization failure — 403 Forbidden, not 404.
      // Returning 404 instead of 403 is a common pattern to avoid
      // revealing that a resource exists to unauthorized callers.
      throw { statusCode: 403, message: 'You do not own this listing' };
    }
    return listing;
  },

  /** Create a new room listing */
  async create(phone: string, input: CreateRoomListingInput) {
    const data    = createRoomListingSchema.parse(input);
    const profile = await roomListingService.resolveProvider(phone);
    return roomListingRepository.create(profile.id, data);
  },

  /** List all rooms for the provider dashboard */
  async listForProvider(phone: string) {
    const profile = await roomListingService.resolveProvider(phone);
    return roomListingRepository.findByProvider(profile.id);
  },

  /** Fetch one listing (validates ownership) */
  async getOne(phone: string, listingId: string) {
    const profile = await roomListingService.resolveProvider(phone);
    return roomListingService.assertOwnership(listingId, profile.id);
  },

  /** Update listing fields (ownership-guarded) */
  async update(phone: string, listingId: string, input: UpdateRoomListingInput) {
    const data    = updateRoomListingSchema.parse(input);
    const profile = await roomListingService.resolveProvider(phone);
    await roomListingService.assertOwnership(listingId, profile.id);
    return roomListingRepository.update(listingId, data);
  },

  /**
   * Toggle listing active/inactive.
   *
   * The body sent from frontend is: { isActive: boolean }
   * The service derives the new status and passes it to repository.
   * Frontend never sends status directly — it's always computed server-side.
   */
  async toggle(phone: string, listingId: string, isActive: boolean) {
    const profile = await roomListingService.resolveProvider(phone);
    await roomListingService.assertOwnership(listingId, profile.id);
    return roomListingRepository.toggle(listingId, isActive);
  },

  /** Soft-delete listing */
  async remove(phone: string, listingId: string) {
    const profile = await roomListingService.resolveProvider(phone);
    await roomListingService.assertOwnership(listingId, profile.id);
    return roomListingRepository.softDelete(listingId);
  },

  async adjustInventory(phone: string, listingId: string, delta: number) {
    const profile = await roomListingService.resolveProvider(phone);
    await roomListingService.assertOwnership(listingId, profile.id);
    return roomListingRepository.adjustInventory(listingId, delta);
  },
};
