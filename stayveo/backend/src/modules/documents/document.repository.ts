// ─── Document Repository ────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { DocType } from '../../common/enums.js';
import type { CreateDocumentInput } from './document.schema.js';

export const documentRepository = {
  /** Create a document record */
  async create(providerId: string, data: CreateDocumentInput) {
    return prisma.document.create({
      data: {
        providerId,
        docType: data.docType as DocType,
        fileUrl: data.fileUrl,
      },
    });
  },

  /** Find all documents for a provider */
  async findByProviderId(providerId: string) {
    return prisma.document.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
