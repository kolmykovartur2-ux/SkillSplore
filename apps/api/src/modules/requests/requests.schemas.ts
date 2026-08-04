import { z } from 'zod';

const createRequestFields = {
  kind: z.enum(['LEARNING', 'SERVICE']).default('LEARNING'),
  // Optional so "Other subject or skill" can be chosen instead of picking
  // from the catalogue -- see the refine below and requests.routes.ts, which
  // resolves the required DB column to a placeholder row in that case.
  subjectId: z.number().int().positive().optional(),
  customSubjectLabel: z.string().trim().min(2).max(120).optional(),
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
};

export const createRequestSchema = z.object(createRequestFields).refine(
  (d) => !!d.subjectId || !!d.customSubjectLabel,
  { message: 'Choose a subject, or describe it under "Other subject or skill".', path: ['subjectId'] },
);

export const updateRequestSchema = z.object(createRequestFields).partial().omit({ publish: true });

export const feedQuerySchema = z.object({
  kind: z.enum(['LEARNING', 'SERVICE']).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  levelId: z.coerce.number().int().positive().optional(),
  mode: z.enum(['online', 'in_person']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
