// ─── Media Service ──────────────────────────────────────────────────────
// Enforces max 6 images per service business rule

import { mediaRepository } from './media.repository.js';
import { uploadMediaSchema } from './media.schema.js';
import type { UploadMediaInput } from './media.schema.js';
import { providerService } from '../provider/provider.service.js';
import { MAX_IMAGES_PER_SERVICE } from '../../common/constants.js';
import { ServiceCategory } from '../../common/enums.js';

export const mediaService = {
  /** Upload a media file — enforces the 6-image limit per service */
  async upload(userId: string, input: UploadMediaInput) {
    const data = uploadMediaSchema.parse(input);
    const provider = await providerService.getByUserId(userId);

    const currentCount = await mediaRepository.countByProviderAndService(
      provider.id,
      data.serviceType as ServiceCategory
    );

    if (currentCount >= MAX_IMAGES_PER_SERVICE) {
      throw {
        statusCode: 400,
        message: `Maximum ${MAX_IMAGES_PER_SERVICE} images allowed per service. You already have ${currentCount}.`,
      };
    }

    return mediaRepository.create(provider.id, data);
  },

  /** Get all media for a provider */
  async getByProviderId(providerId: string) {
    return mediaRepository.findByProviderId(providerId);
  },
};
