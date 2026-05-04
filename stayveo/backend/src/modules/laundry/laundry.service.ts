// ─── Laundry Service ────────────────────────────────────────────────────

import { laundryRepository } from './laundry.repository.js';
import { createLaundrySchema, laundryFilterSchema } from './laundry.schema.js';
import type { CreateLaundryInput, LaundryFilterInput } from './laundry.schema.js';
import { providerService } from '../provider/provider.service.js';
import { serviceSelectionService } from '../services/service.service.js';
import { ServiceCategory } from '../../common/enums.js';

export const laundryService = {
  /** Create a laundry listing */
  async create(userId: string, input: CreateLaundryInput) {
    const data = createLaundrySchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    await serviceSelectionService.ensureServiceExists(provider.id, ServiceCategory.LAUNDRY);
    return laundryRepository.create(provider.id, data);
  },

  /** List laundry services with filters */
  async list(queryParams: LaundryFilterInput) {
    const filters = laundryFilterSchema.parse(queryParams);
    return laundryRepository.findFiltered(filters);
  },
};
