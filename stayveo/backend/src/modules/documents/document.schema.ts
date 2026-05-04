// ─── Document Zod Schemas ───────────────────────────────────────────────

import { z } from 'zod';

export const createDocumentSchema = z.object({
  docType: z.enum(['ID_PROOF', 'BUSINESS_PROOF']),
  fileUrl: z.string().url(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
