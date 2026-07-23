import { Router, type Request } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { selfUser } from '../../lib/serializers.js';
import { env } from '../../config/env.js';
import { forbidden } from '../../lib/errors.js';
import {
  registerSchema,
  loginSchema,
  requestResetSchema,
  resetSchema,
  tokenSchema,
  demoLoginSchema,
} from './auth.schemas.js';
import * as auth from './auth.service.js';

export const authRouter = Router();

// Regenerate the session on privilege change to prevent session fixation.
function loginSession(req: Request, userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const user = await auth.register(req.body);
    await loginSession(req, user.id);
    res.status(201).json({ user: selfUser(user) });
  }),
);

authRouter.post(
  '/verify-email',
  validate({ body: tokenSchema }),
  asyncHandler(async (req, res) => {
    await auth.verifyEmail(req.body.token);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const user = await auth.authenticate(req.body.email, req.body.password);
    await loginSession(req, user.id);
    res.json({ user: selfUser(user) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie('skillsplore.sid');
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/request-password-reset',
  authLimiter,
  validate({ body: requestResetSchema }),
  asyncHandler(async (req, res) => {
    await auth.requestPasswordReset(req.body.email);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetSchema }),
  asyncHandler(async (req, res) => {
    await auth.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user ? selfUser(req.user) : null });
  }),
);

// Demo-only login shortcut. Hard-disabled in production.
authRouter.post(
  '/demo-login',
  validate({ body: demoLoginSchema }),
  asyncHandler(async (req, res) => {
    if (!env.demoLoginEnabled) throw forbidden('Demo login is disabled.');
    const user = await auth.findDemoUser(req.body.role);
    await loginSession(req, user.id);
    res.json({ user: selfUser(user) });
  }),
);

authRouter.get('/session-check', requireAuth, (req, res) => {
  res.json({ user: selfUser(req.user!) });
});
