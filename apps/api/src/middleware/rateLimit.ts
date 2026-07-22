import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// General API limiter. In-memory store is sufficient for a single-node MVP;
// swap for a shared store (e.g. Redis) when scaling horizontally (documented).
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Only actually enforce in demo/production; keep dev friction-free.
  skip: () => env.isDevelopment,
});

// Stricter limiter for auth endpoints to slow credential stuffing / abuse.
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isDevelopment,
});
