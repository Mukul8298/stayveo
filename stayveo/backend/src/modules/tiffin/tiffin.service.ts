// ─── Tiffin Service ─────────────────────────────────────────────────────

import { tiffinRepository } from './tiffin.repository.js';
import { createTiffinSchema, tiffinFilterSchema } from './tiffin.schema.js';
import type { CreateTiffinInput, TiffinFilterInput } from './tiffin.schema.js';
import { providerService } from '../provider/provider.service.js';
import { serviceSelectionService } from '../services/service.service.js';
import { ServiceCategory } from '../../common/enums.js';

export const tiffinService = {
  /** Create a new tiffin listing */
  async create(userId: string, input: CreateTiffinInput) {
    const data = createTiffinSchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    await serviceSelectionService.ensureServiceExists(provider.id, ServiceCategory.TIFFIN);
    return tiffinRepository.create(provider.id, data);
  },

  /** List tiffin services with filters */
  async list(queryParams: TiffinFilterInput) {
    const filters = tiffinFilterSchema.parse(queryParams);
    return tiffinRepository.findFiltered(filters);
  },
};
