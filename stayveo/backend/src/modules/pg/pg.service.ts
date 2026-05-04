// ─── PG Service ─────────────────────────────────────────────────────────

import { pgRepository } from './pg.repository.js';
import { createPGSchema, pgFilterSchema } from './pg.schema.js';
import type { CreatePGInput, PGFilterInput } from './pg.schema.js';
import { providerService } from '../provider/provider.service.js';
import { serviceSelectionService } from '../services/service.service.js';
import { ServiceCategory } from '../../common/enums.js';

export const pgService = {
  /** Create a new PG listing */
  async create(userId: string, input: CreatePGInput) {
    const data = createPGSchema.parse(input);
    const provider = await providerService.getByUserId(userId);
    await serviceSelectionService.ensureServiceExists(provider.id, ServiceCategory.PG);
    return pgRepository.create(provider.id, data);
  },

  /** Get a single PG listing by ID */
  async getById(id: string) {
    const pg = await pgRepository.findById(id);
    if (!pg) throw { statusCode: 404, message: 'PG listing not found' };
    return pg;
  },

  /** List PG rooms with advanced filters */
  async list(queryParams: PGFilterInput) {
    const filters = pgFilterSchema.parse(queryParams);
    return pgRepository.findFiltered(filters);
  },
};
