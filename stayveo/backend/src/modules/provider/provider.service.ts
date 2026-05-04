// ─── Provider Service ───────────────────────────────────────────────────

import { providerRepository } from './provider.repository.js';
import { createProviderSchema, updateProviderSchema } from './provider.schema.js';
import type { CreateProviderInput, UpdateProviderInput } from './provider.schema.js';
import { userService } from '../users/user.service.js';

export const providerService = {
  /** Get provider by user ID */
  async getByUserId(userId: string) {
    const provider = await providerRepository.findByUserId(userId);
    if (!provider) throw { statusCode: 404, message: 'Provider profile not found' };
    return provider;
  },

  /** Get provider by provider ID */
  async getById(id: string) {
    const provider = await providerRepository.findById(id);
    if (!provider) throw { statusCode: 404, message: 'Provider not found' };
    return provider;
  },

  /** Create a provider profile */
  async create(userId: string, input: CreateProviderInput) {
    const data = createProviderSchema.parse(input);

    // Ensure the user exists
    await userService.getById(userId);

    // Check if provider profile already exists
    const existing = await providerRepository.findByUserId(userId);
    if (existing) throw { statusCode: 409, message: 'Provider profile already exists' };

    return providerRepository.create(userId, data);
  },

  /** Update provider profile */
  async update(userId: string, input: UpdateProviderInput) {
    const data = updateProviderSchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    return providerRepository.update(provider.id, data);
  },
};
