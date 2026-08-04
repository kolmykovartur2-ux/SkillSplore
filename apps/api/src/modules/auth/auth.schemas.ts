import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(200).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(200),
  displayName: z.string().min(2).max(80).trim(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and privacy policy.' }) }),
  // Account holders must be 18+. A parent or guardian arranges learning for a
  // child through their own adult account -- see the Terms, section 2.
  //
  // This is a self-declaration, not a verified age check, and it is not
  // presented as one. Its purpose is that the platform never knowingly holds
  // a child's account, which is what keeps the children's-privacy surface
  // limited to "information an adult chose to share about their child".
  confirmAdult: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 18 or over to create an account.' }),
  }),
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
