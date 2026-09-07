// ─── Media Zod Schemas ──────────────────────────────────────────────────

import { z } from 'zod';

export const uploadMediaSchema = z.object({
  serviceType: z.enum(['PG', 'TIFFIN']),
  fileUrl: z.string().url(),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
