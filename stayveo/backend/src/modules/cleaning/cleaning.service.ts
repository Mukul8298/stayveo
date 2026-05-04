// ─── Cleaning Service ───────────────────────────────────────────────────

import { cleaningRepository } from './cleaning.repository.js';
import { createCleaningSchema, cleaningFilterSchema } from './cleaning.schema.js';
import type { CreateCleaningInput, CleaningFilterInput } from './cleaning.schema.js';
import { providerService } from '../provider/provider.service.js';
import { serviceSelectionService } from '../services/service.service.js';
import { ServiceCategory } from '../../common/enums.js';

export const cleaningService = {
  /** Create a cleaning listing */
  async create(userId: string, input: CreateCleaningInput) {
    const data = createCleaningSchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    await serviceSelectionService.ensureServiceExists(provider.id, ServiceCategory.CLEANING);
    return cleaningRepository.create(provider.id, data);
  },

  /** List cleaning services with filters */
  async list(queryParams: CleaningFilterInput) {
    const filters = cleaningFilterSchema.parse(queryParams);
    return cleaningRepository.findFiltered(filters);
  },
};
