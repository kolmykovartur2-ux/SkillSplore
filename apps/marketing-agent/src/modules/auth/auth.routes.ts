import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { prisma } from '../../lib/prisma.js';
import { verifyPassword } from '../../lib/password.js';
import { unauthorized } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { env } from '../../config/env.js';

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const admin = await prisma.adminUser.findUnique({ where: { email: req.body.email.toLowerCase() } });
    // Same generic response whether the account doesn't exist, the password
    // is wrong, or the account is locked — avoids leaking account existence.
    const genericError = unauthorized('Incorrect email or password.');

    if (!admin) throw genericError;
    if (admin.lockedUntil && admin.lockedUntil > new Date()) throw genericError;

    const ok = await verifyPassword(req.body.password, admin.passwordHash);
    if (!ok) {
      const failedLoginCount = admin.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= env.LOGIN_LOCKOUT_THRESHOLD
          ? new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000)
          : null;
      await prisma.adminUser.update({ where: { id: admin.id }, data: { failedLoginCount, lockedUntil } });
      throw genericError;
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Regenerate the session on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.adminUserId = admin.id;
      req.session.save(async (saveErr) => {
        if (saveErr) throw saveErr;
        await writeAudit({ actorId: admin.id, action: 'admin.login', entityType: 'AdminUser', entityId: admin.id });
        res.json({ id: admin.id, email: admin.email, displayName: admin.displayName });
      });
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const actorId = req.session.adminUserId ?? null;
    req.session.destroy(() => undefined);
    if (actorId) await writeAudit({ actorId, action: 'admin.logout' });
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ id: req.adminUser!.id, email: req.adminUser!.email, displayName: req.adminUser!.displayName });
  }),
);
