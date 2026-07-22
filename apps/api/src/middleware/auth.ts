import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';

// Loads the session user (if any) onto req.user. Runs on every request.
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && !user.deletedAt) {
        req.user = user;
      } else {
        // Stale session pointing at a removed account.
        req.session.destroy(() => undefined);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (req.user.status === 'SUSPENDED') {
    return next(forbidden('This account is suspended.'));
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (req.user.status === 'SUSPENDED') return next(forbidden('This account is suspended.'));
    const has = roles.some((r) => req.user!.roles.includes(r));
    if (!has) return next(forbidden());
    next();
  };
}

export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (!req.user.emailVerifiedAt) {
    return next(forbidden('Please confirm your email address to continue.'));
  }
  next();
}

export const isAdmin = (req: Request): boolean => !!req.user?.roles.includes('ADMIN');
