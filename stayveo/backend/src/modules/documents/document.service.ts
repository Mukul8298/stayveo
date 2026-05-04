// ─── Document Service ───────────────────────────────────────────────────

import { documentRepository } from './document.repository.js';
import { createDocumentSchema } from './document.schema.js';
import type { CreateDocumentInput } from './document.schema.js';
import { providerService } from '../provider/provider.service.js';

export const documentService = {
  /** Upload a document (id_proof / business_proof) */
  async create(userId: string, input: CreateDocumentInput) {
    const data = createDocumentSchema.parse(input);

    // Ensure provider exists
    const provider = await providerService.getByUserId(userId);

    return documentRepository.create(provider.id, data);
  },

  /** Get all documents for a provider */
  async getByProviderId(providerId: string) {
    return documentRepository.findByProviderId(providerId);
  },
};
