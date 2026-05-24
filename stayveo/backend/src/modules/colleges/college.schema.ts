import { z } from 'zod';

export const collegeQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const collegeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CollegeQueryInput = z.infer<typeof collegeQuerySchema>;
