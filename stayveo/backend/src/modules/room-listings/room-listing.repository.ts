// ─── Room Listing Repository ─────────────────────────────────────────────
// Pure Prisma queries — no business logic here.
//
// ARCHITECTURE PRINCIPLE:
//   This layer only knows about Prisma and the database.
//   It does NOT know about HTTP, Fastify, or request/response objects.
//   If you ever swap Prisma for Drizzle/Knex, ONLY this file changes.
// ─────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { RoomStatus } from '@prisma/client';
import type { CreateRoomListingInput, UpdateRoomListingInput } from './room-listing.schema.js';

export const roomListingRepository = {
  /** Create a new room listing */
  async create(providerId: string, data: CreateRoomListingInput) {
    // Business rule: if provider sets availableBeds = 0 on creation, mark as FULL
    const status: RoomStatus = data.availableBeds === 0 ? 'FULL' : 'ACTIVE';

    return prisma.roomListing.create({
      data: {
        providerId,
        title:            data.title,
        description:      data.description,
        roomType:         data.roomType,
        genderPreference: data.genderPreference,
        price:            data.price,
        securityDeposit:  data.securityDeposit,
        totalBeds:        data.totalBeds,
        availableBeds:    data.availableBeds,
        floor:            data.floor,
        amenities:        data.amenities,
        images:           data.images,
        isActive:         data.isActive,
        status,
      },
    });
  },

  /**
   * List all listings for a provider (provider dashboard view).
   * Returns ALL statuses — ACTIVE, FULL, CLOSED.
   * The provider sees everything; students only see ACTIVE.
   */
  async findByProvider(providerId: string) {
    return prisma.roomListing.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Fetch a single listing by ID */
  async findById(id: string) {
    return prisma.roomListing.findUnique({ where: { id } });
  },

  /**
   * Update listing fields.
   *
   * INVENTORY AUTO-LOGIC:
   *   After any update, we recalculate status based on the new state.
   *   - availableBeds = 0 → FULL (auto-hide from students)
   *   - availableBeds > 0 AND isActive = true → ACTIVE
   *   - isActive = false → CLOSED
   *
   * This is a pure function — the service calls us, we run the query.
   */
  async update(id: string, data: UpdateRoomListingInput) {
    // First fetch current record to fill missing fields for status derivation
    const current = await prisma.roomListing.findUniqueOrThrow({ where: { id } });

    const newAvailableBeds = data.availableBeds ?? current.availableBeds;
    const newIsActive      = data.isActive      ?? current.isActive;

    // Derive new status
    let newStatus: RoomStatus;
    if (!newIsActive) {
      newStatus = 'CLOSED';
    } else if (newAvailableBeds === 0) {
      newStatus = 'FULL';
    } else {
      newStatus = 'ACTIVE';
    }

    return prisma.roomListing.update({
      where: { id },
      data: {
        ...data,
        status: newStatus,
      },
    });
  },

  /**
   * Toggle isActive on/off. Derives status from the toggle + availableBeds.
   *
   * WHY PATCH is the right HTTP verb here:
   *   PUT = "replace the whole resource"
   *   PATCH = "change one specific thing"
   *   A toggle only changes isActive (and derived status).
   *   PATCH is semantically more correct and cheaper on the wire.
   */
  async toggle(id: string, isActive: boolean) {
    const current = await prisma.roomListing.findUniqueOrThrow({ where: { id } });

    let newStatus: RoomStatus;
    if (!isActive) {
      newStatus = 'CLOSED';
    } else if (current.availableBeds === 0) {
      newStatus = 'FULL';
    } else {
      newStatus = 'ACTIVE';
    }

    return prisma.roomListing.update({
      where: { id },
      data: { isActive, status: newStatus },
    });
  },

  /**
   * Soft-delete: mark as CLOSED + isActive = false.
   *
   * WHY soft delete (not real delete)?
   *   If a student had a booking for this room, we need the record to exist
   *   to show booking history. Hard deletes break referential integrity.
   *   This is the standard pattern in marketplace apps.
   */
  async softDelete(id: string) {
    return prisma.roomListing.update({
      where: { id },
      data: { isActive: false, status: 'CLOSED' },
    });
  },

  /**
   * Student-facing query: only ACTIVE listings with beds available.
   * This is THE most important query for marketplace visibility.
   *
   * PERFORMANCE NOTE:
   *   In production, add a composite index:
   *   @@index([providerId, status, isActive, availableBeds])
   *   to make this query a pure index scan.
   */
  async findActiveForProvider(providerId: string) {
    return prisma.roomListing.findMany({
      where: {
        providerId,
        status:       'ACTIVE',
        isActive:     true,
        availableBeds: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
