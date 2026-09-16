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
        address:          data.address,
        latitude:         data.latitude,
        longitude:        data.longitude,
        roomType:         data.roomType,
        genderPreference: data.genderPreference,
        price:            data.price,
        securityDeposit:  data.securityDeposit,
        reservationFee:   data.reservationFee,
        minimumStayMonths: data.minimumStayMonths,
        numberOfBeds:     data.numberOfBeds,
        platformFee:      data.platformFee,
        foodCharges:      data.foodCharges,
        electricityCharges: data.electricityCharges,
        waterCharges:     data.waterCharges,
        maintenanceCharges: data.maintenanceCharges,
        parkingCharges:   data.parkingCharges,
        otherCharges:     data.otherCharges,
        totalBeds:        data.totalBeds,
        availableBeds:    data.availableBeds,
        reservedBeds:     data.reservedBeds,
        occupiedBeds:     data.occupiedBeds,
        blockedBeds:      data.blockedBeds,
        offlineBeds:      data.offlineBeds,
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
    const nextTotalBeds = data.totalBeds ?? current.totalBeds;
    const nextReservedBeds = data.reservedBeds ?? current.reservedBeds;
    const nextOccupiedBeds = data.occupiedBeds ?? current.occupiedBeds;
    const nextBlockedBeds = data.blockedBeds ?? current.blockedBeds;
    const nextOfflineBeds = data.offlineBeds ?? current.offlineBeds;
    const allocatedBeds = nextReservedBeds + nextOccupiedBeds + nextBlockedBeds + nextOfflineBeds;
    if (nextTotalBeds < 1 || allocatedBeds > nextTotalBeds) {
      throw { statusCode: 409, message: 'Total beds cannot be lower than reserved or occupied beds.' };
    }
    if (newAvailableBeds < 0 || newAvailableBeds > nextTotalBeds - allocatedBeds) {
      throw { statusCode: 409, message: 'Available beds do not match the current inventory allocation.' };
    }

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

  /** Public discovery query. Visibility and availability are enforced here. */
  async findActiveForStudents() {
    const [roomListings, allInventoryProviders] = await Promise.all([
      prisma.roomListing.findMany({
        where: {
          status: 'ACTIVE',
          isActive: true,
          availableBeds: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.roomListing.findMany({
        select: { providerId: true },
        distinct: ['providerId'],
      }),
    ]);

    // Legacy onboarding records remain discoverable only for providers that
    // have not moved to inventory-backed RoomListings. Once a provider has a
    // RoomListing, its visibility is controlled by that inventory row.
    const inventoryProviderIds = new Set(allInventoryProviders.map((listing) => listing.providerId));
    const legacyListings = await prisma.pGDetails.findMany({
      where: {
        service: {
          providerId: { notIn: [...inventoryProviderIds] },
        },
      },
      orderBy: { id: 'desc' },
      include: {
        service: {
          select: {
            providerId: true,
            provider: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    return [
      ...roomListings.map((listing) => ({
        ...listing,
        listingSource: 'room_listing' as const,
      })),
      ...legacyListings.map((listing) => ({
        id: listing.id,
        providerId: listing.service.providerId,
        title: listing.pgName,
        description: null,
        address: listing.address,
        roomType: listing.roomType,
        price: listing.minPrice,
        securityDeposit: listing.securityDeposit,
        reservationFee: listing.reservationFee,
        minimumStayMonths: listing.minimumStayMonths,
        numberOfBeds: listing.numberOfBeds,
        platformFee: 0,
        foodCharges: 0,
        electricityCharges: 0,
        waterCharges: 0,
        maintenanceCharges: 0,
        parkingCharges: 0,
        otherCharges: 0,
        totalBeds: listing.numberOfBeds,
        availableBeds: listing.numberOfBeds,
        reservedBeds: 0,
        occupiedBeds: 0,
        blockedBeds: 0,
        offlineBeds: 0,
        images: listing.photos,
        amenities: listing.amenities,
        isActive: true,
        status: 'ACTIVE' as const,
        listingSource: 'legacy_pg_details' as const,
        provider: listing.service.provider,
      })),
    ];
  },

  /** Atomically adjust total capacity while preserving allocated beds. */
  async adjustInventory(id: string, delta: number) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.roomListing.findUnique({ where: { id } });
      if (!current) throw { statusCode: 404, message: 'Listing not found' };

      const minimumTotal = current.reservedBeds + current.occupiedBeds + current.blockedBeds + current.offlineBeds;
      const nextTotal = current.totalBeds + delta;
      if (nextTotal < minimumTotal) {
        throw {
          statusCode: 409,
          message: 'You cannot remove beds that are already reserved or occupied.',
        };
      }
      if (nextTotal < 1) {
        throw { statusCode: 400, message: 'A listing must have at least one bed.' };
      }

      const nextAvailable = nextTotal - minimumTotal;
      const nextStatus = !current.isActive ? 'CLOSED' : nextAvailable === 0 ? 'FULL' : 'ACTIVE';
      return tx.roomListing.update({
        where: { id },
        data: {
          totalBeds: nextTotal,
          availableBeds: nextAvailable,
          status: nextStatus,
        },
      });
    });
  },
};
