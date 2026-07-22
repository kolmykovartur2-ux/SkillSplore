import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(200).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(200),
  displayName: z.string().min(2).max(80).trim(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and privacy policy.' }) }),
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
