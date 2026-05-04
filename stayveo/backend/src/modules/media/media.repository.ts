// ─── Media Repository ───────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { ServiceCategory } from '../../common/enums.js';
import type { UploadMediaInput } from './media.schema.js';

export const mediaRepository = {
  /** Count existing media for a provider + service type combo */
  async countByProviderAndService(providerId: string, serviceType: ServiceCategory) {
    return prisma.mediaUpload.count({
      where: { providerId, serviceType },
    });
  },

  /** Create a media upload record */
  async create(providerId: string, data: UploadMediaInput) {
    return prisma.mediaUpload.create({
      data: {
        providerId,
        serviceType: data.serviceType as ServiceCategory,
        fileUrl: data.fileUrl,
      },
    });
  },

  /** Find all media for a provider */
  async findByProviderId(providerId: string) {
    return prisma.mediaUpload.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
