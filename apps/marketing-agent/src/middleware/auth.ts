import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';

// Loads the session's founder/admin account (if any) onto req.adminUser.
// This service has its own single small auth surface — it never shares
// sessions, cookies, or a user table with the marketplace (apps/api).
export async function loadAdminUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.session.adminUserId;
    if (id) {
      const adminUser = await prisma.adminUser.findUnique({ where: { id } });
      if (adminUser) {
        req.adminUser = adminUser;
      } else {
        req.session.destroy(() => undefined);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.adminUser) return next(unauthorized());
  next();
}
