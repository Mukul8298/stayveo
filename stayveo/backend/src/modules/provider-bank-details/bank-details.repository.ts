import prisma from '../../common/db/prisma.js';

const KYC_TYPES = ['AADHAR', 'PAN'] as const;

export const providerBankDetailsRepository = {
  async findByProviderId(providerId: string) {
    return prisma.providerBankDetails.findUnique({
      where: { providerId },
      select: {
        id: true,
        providerId: true,
        accountHolderName: true,
        accountNumber: true,
        ifscCode: true,
        bankName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findKycByProviderId(providerId: string) {
    return prisma.providerVerification.findMany({
      where: { providerId, idType: { in: [...KYC_TYPES] } },
      select: { idType: true, idNumber: true, isVerified: true },
    });
  },

  async upsert(
    providerId: string,
    data: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
    },
    kyc?: { aadhaarNumber?: string; panNumber?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const bankDetails = await tx.providerBankDetails.upsert({
        where: { providerId },
        create: { providerId, ...data },
        update: data,
        select: {
          id: true,
          providerId: true,
          accountHolderName: true,
          accountNumber: true,
          ifscCode: true,
          bankName: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const [idType, idNumber] of [
        ['AADHAR', kyc?.aadhaarNumber],
        ['PAN', kyc?.panNumber],
      ] as const) {
        if (!idNumber) continue;
        await tx.providerVerification.upsert({
          where: { providerId_idType: { providerId, idType } },
          create: { providerId, idType, idNumber, isVerified: true },
          update: { idNumber, isVerified: true },
        });
      }

      const verifications = await tx.providerVerification.findMany({
        where: { providerId, idType: { in: [...KYC_TYPES] } },
        select: { idType: true, idNumber: true, isVerified: true },
      });
      if (verifications.some((item) => item.idType === 'AADHAR') && verifications.some((item) => item.idType === 'PAN')) {
        await tx.providerProfile.update({ where: { id: providerId }, data: { isVerified: true } });
      }

      return { bankDetails, verifications };
    });
  },
};
