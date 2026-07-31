import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword, assertPasswordStrength } from '../../lib/password.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { sendMail, verificationEmail } from '../../lib/mailer.js';
import { writeAudit } from '../../lib/audit.js';
import { badRequest, conflict, unauthorized } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import type { User } from '@prisma/client';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function link(pathname: string, token: string): string {
  const url = new URL(pathname, env.WEB_ORIGIN);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  assertPasswordStrength(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with that email already exists.');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      roles: ['STUDENT'],
      termsAcceptedAt: new Date(),
    },
  });

  const { token, tokenHash } = generateToken();
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      type: 'VERIFY_EMAIL',
      tokenHash,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  await sendMail({
    to: user.email,
    subject: 'Confirm your SkillSplore email',
    text: verificationEmail(user.displayName, link('/verify-email', token)),
  });
  await writeAudit({ actorId: user.id, action: 'user.register', entityType: 'User', entityId: user.id });
  return user;
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'VERIFY_EMAIL' || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This confirmation link is invalid or has expired.');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await writeAudit({ actorId: record.userId, action: 'user.email_verified', entityType: 'User', entityId: record.userId });
}

export async function authenticate(email: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Uniform failure to avoid revealing which accounts exist -- this same
  // response also covers an account that's temporarily locked out (below):
  // a distinguishable "account locked" message would itself leak that the
  // account exists, so it deliberately looks identical to a wrong password.
  const invalid = unauthorized('Incorrect email or password.');
  if (!user || user.deletedAt) throw invalid;

  // Per-account lockout: reject without even checking the password while
  // locked, and without extending the lock further on repeated attempts.
  if (user.lockedUntil && user.lockedUntil > new Date()) throw invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= env.LOGIN_LOCKOUT_THRESHOLD ? new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
    throw invalid;
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }

  if (user.status === 'SUSPENDED') {
    throw unauthorized('This account is suspended. Contact support.');
  }
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed silently to prevent account enumeration.
  if (!user || user.deletedAt) return;
  const { token, tokenHash } = generateToken();
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      type: 'RESET_PASSWORD',
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  await sendMail({
    to: user.email,
    subject: 'Reset your SkillSplore password',
    text: `Reset your password using this link (valid for one hour):\n${link('/reset-password', token)}\n\nIf you did not request this, you can ignore it.`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  assertPasswordStrength(newPassword);
  const record = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'RESET_PASSWORD' || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired.');
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    // Proving ownership via emailed reset link is a stronger signal than a
    // login attempt, so this also clears any brute-force lockout -- a
    // locked-out user isn't stuck waiting out the timer if they can reset.
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate any other outstanding reset tokens for this user.
    prisma.emailToken.updateMany({
      where: { userId: record.userId, type: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  await writeAudit({ actorId: record.userId, action: 'user.password_reset', entityType: 'User', entityId: record.userId });
}

// Demo-only shortcut: returns the pre-seeded demo account for a role.
// Guarded by env.demoLoginEnabled at the route layer (off in production).
export async function findDemoUser(role: 'admin' | 'student' | 'tutor' | 'pending_tutor'): Promise<User> {
  const emailByRole: Record<typeof role, string> = {
    admin: 'admin@demo.skillsplore.local',
    student: 'student@demo.skillsplore.local',
    tutor: 'tutor@demo.skillsplore.local',
    pending_tutor: 'pending.tutor@demo.skillsplore.local',
  } as const;
  const user = await prisma.user.findUnique({ where: { email: emailByRole[role] } });
  if (!user) throw badRequest('Demo accounts are not seeded. Run "npm run demo:seed".');
  return user;
}
