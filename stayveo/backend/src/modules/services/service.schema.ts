// ─── Service Selection Zod Schemas ──────────────────────────────────────

import { z } from 'zod';

export const addServicesSchema = z.object({
  serviceTypes: z.array(z.enum(['PG', 'TIFFIN', 'LAUNDRY', 'CLEANING'])).min(1),
});

export type AddServicesInput = z.infer<typeof addServicesSchema>;
