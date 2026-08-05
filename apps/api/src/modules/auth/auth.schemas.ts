import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(200).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(200),
  displayName: z.string().min(2).max(80).trim(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and privacy policy.' }) }),
  // Declared, not verified. A checkbox stops nobody determined, and this is
  // not presented as anything stronger.
  //
  // Its purpose is that the platform never KNOWINGLY arranges an in-person
  // meeting between a child and an adult stranger. A young person can hold an
  // account and use everything -- search, requests, messaging, online lessons.
  // The single restriction is that their requests must be online; see
  // requests.routes.ts.
  isAdult: z.boolean(),
  // Optional and separate from acceptTerms. Bundling marketing into account
  // creation is exactly what makes the consent invalid, so it is its own
  // field, defaults to false, and nothing fails if it is omitted.
  marketingOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(200),
});

export const requestResetSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export const resetSchema = z.object({
  token: z.string().min(10).max(500),
  password: z.string().min(1).max(200),
});

export const tokenSchema = z.object({ token: z.string().min(10).max(500) });

export const demoLoginSchema = z.object({
  role: z.enum(['admin', 'student', 'tutor', 'pending_tutor']),
});
