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
  UpdateProviderInput,
  VerifyIdInput,
} from './provider.schema.js';

const onboardingInclude = {
  user: { select: { id: true, phone_number: true, role: true } },
  services: {
    include: {
      pgDetails: true,
      tiffinDetails: true,
      laundryDetails: true,
      cleaningDetails: true,
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

  /** Find onboarding provider profile by phone */
  async findOnboardingByPhone(phone: string) {
    return prisma.providerProfile.findUnique({
      where: { phone },
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
      const existingUser = await tx.user.findUnique({ where: { phone_number: data.phone } });

      if (existingUser && existingUser.role !== UserRole.PROVIDER) {
        throw { statusCode: 409, message: 'Phone number is already registered as a student' };
      }

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            phone_number: data.phone,
            role: UserRole.PROVIDER,
          },
        }));

      return tx.providerProfile.upsert({
        where: { phone: data.phone },
        create: {
          userId: user.id,
          phone: data.phone,
          name: data.name.trim(),
          email: data.email?.trim() || null,
          otpVerified: true,
        },
        update: {
          name: data.name.trim(),
          email: data.email?.trim() || null,
        },
        include: onboardingInclude,
      });
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
      case 'LAUNDRY':
        return prisma.laundryDetails.upsert({
          where: { serviceId: service.id },
          create: { serviceId: service.id, ...input.data },
          update: input.data,
        });
      case 'CLEANING':
        return prisma.cleaningDetails.upsert({
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
      case 'LAUNDRY':
        return prisma.laundryDetails.update({
          where: { serviceId: service.id },
          data: { photos: input.photos },
        });
      case 'CLEANING':
        return prisma.cleaningDetails.update({
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
};
