import { z } from 'zod';

export const createRequestSchema = z.object({
  kind: z.enum(['LEARNING', 'SERVICE']).default('LEARNING'),
  subjectId: z.number().int().positive(),
  levelId: z.number().int().positive().nullable().optional(),
  title: z.string().min(4).max(140),
  description: z.string().min(10).max(4000),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON', 'BOTH']).default('BOTH'),
  country: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  locationNote: z.string().max(300).optional(),
  budgetMinCents: z.number().int().min(0).max(100000000).nullable().optional(),
  budgetMaxCents: z.number().int().min(0).max(100000000).nullable().optional(),
  currency: z.enum(['NZD', 'AUD']).default('NZD'),
  timing: z.string().max(300).optional(),
  publish: z.boolean().optional(),
});

export const updateRequestSchema = createRequestSchema.partial().omit({ publish: true });

export const feedQuerySchema = z.object({
  kind: z.enum(['LEARNING', 'SERVICE']).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  levelId: z.coerce.number().int().positive().optional(),
  mode: z.enum(['online', 'in_person']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
