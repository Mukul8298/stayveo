// ─── Provider Repository ────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { UserRole } from '../../common/enums.js';
import type {
  BasicInfoInput,
  CreateProviderInput,
  PhotoUploadInput,
  ServiceDetailsInput,
  ServiceSelectionInput,
  ServiceTypeInput,
  UpdateBusinessDetailsInput,
  UpdateProviderInput,
  VerifyIdInput,
} from './provider.schema.js';

const onboardingInclude = {
  user: { select: { id: true, phone_number: true, role: true } },
  services: {
      include: {
      pgDetails: true,
      tiffinDetails: true,
    },
  },
  verifications: true,
} as const;

export const providerRepository = {
  /** Find provider by user ID */
  async findByUserId(userId: string) {
    return prisma.provider.findUnique({
      where: { userId },
      include: {
        services: true,
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Find provider by provider ID */
  async findById(id: string) {
    return prisma.provider.findUnique({
      where: { id },
      include: {
        services: true,
        user: { select: { id: true, phone_number: true, role: true } },
      },
    });
  },

  /** Create provider profile */
  async create(userId: string, data: CreateProviderInput) {
    return prisma.provider.create({
      data: { ...data, userId },
      include: { services: true },
    });
  },

  /** Update provider */
  async update(id: string, data: UpdateProviderInput) {
    return prisma.provider.update({
      where: { id },
      data,
    });
  },

  /** Find onboarding provider profile by phone or email */
  async findOnboardingByPhone(phone: string) {
    if (!phone) return null;
    return prisma.providerProfile.findFirst({
      where: {
        OR: [
          { phone },
          { email: phone },
          { user: { email: phone } },
        ],
      },
      include: onboardingInclude,
    });
  },

  /** Create the minimum user/provider records needed for OTP */
  async createPendingOnboardingProfile(phone: string) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { phone_number: phone } });

      if (existingUser && existingUser.role !== UserRole.PROVIDER) {
        throw { statusCode: 409, message: 'Phone number is already registered as a student' };
      }

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            phone_number: phone,
            role: UserRole.PROVIDER,
          },
        }));

      return tx.providerProfile.upsert({
        where: { phone },
        create: {
          phone,
          userId: user.id,
        },
        update: {},
        include: onboardingInclude,
      });
    });
  },

  /** Mark dummy OTP as verified */
  async markOtpVerified(phone: string) {
    return prisma.providerProfile.update({
      where: { phone },
      data: { otpVerified: true },
      include: onboardingInclude,
    });
  },

  /** Save common onboarding info */
  async saveBasicInfo(data: BasicInfoInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Check if phone number is already registered by a STUDENT user
      const existingPhoneUser = await tx.user.findFirst({
        where: { phone_number: data.phone },
      });

      if (existingPhoneUser && existingPhoneUser.email !== data.email && existingPhoneUser.role !== UserRole.PROVIDER) {
        throw { statusCode: 409, message: 'Phone number is already registered as a student' };
      }

      // 2. Find authenticated user by email or phone_number
      let user = data.email
        ? await tx.user.findUnique({ where: { email: data.email } })
        : null;

      if (!user && existingPhoneUser) {
        user = existingPhoneUser;
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            email: data.email || null,
            phone_number: data.phone,
            role: UserRole.PROVIDER,
          },
        });
      } else {
        // Save phone_number to existing users table
        await tx.user.update({
          where: { id: user.id },
          data: { phone_number: data.phone },
        });
      }

      // 3. Upsert provider profile linked to user.id
      const existingProfile = await tx.providerProfile.findFirst({
        where: { OR: [{ userId: user.id }, { phone: data.phone }] },
      });

      if (existingProfile) {
        return tx.providerProfile.update({
          where: { id: existingProfile.id },
          data: {
            userId: user.id,
            phone: data.phone,
            name: data.name.trim(),
            email: user.email || data.email?.trim() || null,
            otpVerified: true,
          },
          include: onboardingInclude,
        });
      } else {
        return tx.providerProfile.create({
          data: {
            userId: user.id,
            phone: data.phone,
            name: data.name.trim(),
            email: user.email || data.email?.trim() || null,
            otpVerified: true,
          },
          include: onboardingInclude,
        });
      }
    });
  },

  /** Save selected service types */
  async saveServices(providerId: string, data: ServiceSelectionInput) {
    await prisma.providerService.createMany({
      data: data.services.map((type) => ({ providerId, type })),
      skipDuplicates: true,
    });

    return prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: onboardingInclude,
    });
  },

  /** Find or create one selected provider service */
  async upsertProviderService(providerId: string, type: ServiceTypeInput) {
    return prisma.providerService.upsert({
      where: {
        providerId_type: {
          providerId,
          type,
        },
      },
      create: {
        providerId,
        type,
      },
      update: {},
    });
  },

  /** Save service-specific details */
  async saveServiceDetails(providerId: string, input: ServiceDetailsInput) {
    const service = await providerRepository.upsertProviderService(providerId, input.type);

    switch (input.type) {
      case 'PG':
        return prisma.pGDetails.upsert({
          where: { serviceId: service.id },
          create: { serviceId: service.id, ...input.data },
          update: input.data,
        });
      case 'TIFFIN':
        return prisma.tiffinDetails.upsert({
          where: { serviceId: service.id },
          create: { serviceId: service.id, ...input.data },
          update: input.data,
        });
    }
  },

  /** Replace photo URLs for an existing service detail row */
  async savePhotos(providerId: string, input: PhotoUploadInput) {
    const service = await prisma.providerService.findUnique({
      where: {
        providerId_type: {
          providerId,
          type: input.type,
        },
      },
    });

    if (!service) throw { statusCode: 404, message: 'Provider service not found' };

    switch (input.type) {
      case 'PG':
        return prisma.pGDetails.update({
          where: { serviceId: service.id },
          data: { photos: input.photos },
        });
      case 'TIFFIN':
        return prisma.tiffinDetails.update({
          where: { serviceId: service.id },
          data: { photos: input.photos },
        });
    }
  },

  /** Save identity verification and mark profile verified after AADHAR and PAN exist */
  async saveVerification(providerId: string, input: VerifyIdInput) {
    await prisma.providerVerification.upsert({
      where: {
        providerId_idType: {
          providerId,
          idType: input.idType,
        },
      },
      create: {
        providerId,
        idType: input.idType,
        idNumber: input.idNumber.trim(),
        isVerified: true,
      },
      update: {
        idNumber: input.idNumber.trim(),
        isVerified: true,
      },
    });

    const verifiedTypes = await prisma.providerVerification.findMany({
      where: {
        providerId,
        idType: { in: ['AADHAR', 'PAN'] },
        isVerified: true,
      },
      select: { idType: true },
    });

    const isVerified = new Set(verifiedTypes.map((item) => item.idType)).size === 2;

    return prisma.providerProfile.update({
      where: { id: providerId },
      data: { isVerified },
      include: onboardingInclude,
    });
  },

  /**
   * Dashboard stats — runs 3 DB queries in PARALLEL using Promise.all.
   *
   * Why parallel? If we awaited them sequentially:
   *   query1 (50ms) → query2 (50ms) → query3 (50ms) = 150ms total
   * With Promise.all all 3 fire at once:
   *   all 3 run simultaneously → ~50ms total
   *
   * This is the standard pattern for dashboard aggregations.
   */
  async getDashboardStats(providerId: string) {
    const [serviceCount, bookingCount, earningsResult] = await Promise.all([
      // Active listings = how many service types this provider has enrolled in
      prisma.providerService.count({
        where: { providerId },
      }),

      // Total bookings ever received by this provider
      prisma.booking.count({
        where: { providerId },
      }),

      // Total PAID earnings — aggregate._sum gives us the SUM of amount column
      prisma.payment.aggregate({
        where: { providerId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      activeListings: serviceCount,
      totalBookings:  bookingCount,
      totalEarnings:  Number(earningsResult._sum.amount ?? 0),
    };
  },

  /** Fetch the onboarding profile (used by Business Details page to prefill form) */
  async getOnboardingProfile(phone: string) {
    return prisma.providerProfile.findUnique({
      where: { phone },
      select: {
        id:            true,
        phone:         true,
        name:          true,
        email:         true,
        businessName:  true,
        address:       true,
        contactNumber: true,
        description:   true,
        isVerified:    true,
        services: {
          select: { type: true },
        },
      },
    });
  },

  /**
   * Partial update of provider profile fields from the Business Details page.
   * Uses Prisma's update (not upsert) — the record MUST already exist.
   * Only updates fields that were explicitly passed (undefined = skip).
   */
  async updateOnboardingProfileFields(phone: string, data: UpdateBusinessDetailsInput) {
    return prisma.providerProfile.update({
      where: { phone },
      data: {
        ...(data.name          !== undefined && { name:          data.name }),
        ...(data.email         !== undefined && { email:         data.email }),
        ...(data.businessName  !== undefined && { businessName:  data.businessName }),
        ...(data.address       !== undefined && { address:       data.address }),
        ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber }),
        ...(data.description   !== undefined && { description:   data.description }),
      },
      select: {
        id:            true,
        phone:         true,
        name:          true,
        email:         true,
        businessName:  true,
        address:       true,
        contactNumber: true,
        description:   true,
      },
    });
  },
};
