import { z } from 'zod';

export const updateTutorSchema = z.object({
  headline: z.string().max(140).optional(),
  experience: z.string().max(4000).optional(),
  teachingStyle: z.string().max(4000).optional(),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON', 'BOTH']).optional(),
  country: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  locationNote: z.string().max(300).optional(),
  travelRadiusKm: z.number().int().min(0).max(500).nullable().optional(),
  availabilityNote: z.string().max(1000).optional(),
  hourlyRateCents: z.number().int().min(0).max(100000000).nullable().optional(),
  currency: z.enum(['NZD', 'AUD']).optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
});

export const subjectsSchema = z.object({
  subjects: z
    .array(
      z.object({
        subjectId: z.number().int().positive(),
        priceCents: z.number().int().min(0).max(100000000).nullable().optional(),
      }),
    )
    .max(40),
});

export const levelsSchema = z.object({
  levelIds: z.array(z.number().int().positive()).max(30),
});

export const availabilitySchema = z.object({
  slots: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(0).max(6),
          startMinute: z.number().int().min(0).max(1439),
          endMinute: z.number().int().min(1).max(1440),
        })
        .refine((s) => s.endMinute > s.startMinute, { message: 'End must be after start.' }),
    )
    .max(60),
});

export const qualificationSchema = z.object({
  title: z.string().min(2).max(200),
  institution: z.string().max(200).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});
