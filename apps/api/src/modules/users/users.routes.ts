import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { uploadImage } from '../../lib/upload.js';
import { storage } from '../../lib/storage.js';
import { prisma } from '../../lib/prisma.js';
import { selfUser } from '../../lib/serializers.js';
import { writeAudit } from '../../lib/audit.js';
import { badRequest } from '../../lib/errors.js';
import crypto from 'node:crypto';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(80).trim().optional(),
  bio: z.string().max(2000).optional(),
});

usersRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { displayName: req.body.displayName, bio: req.body.bio },
    });
    res.json({ user: selfUser(user) });
  }),
);

usersRouter.post(
  '/me/avatar',
  requireAuth,
  uploadImage.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No image was uploaded.');
    const stored = await storage.put('avatars', req.file.originalname, req.file.buffer, req.file.mimetype);
    const previous = req.user!.avatarKey;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarKey: stored.key },
    });
    if (previous) await storage.delete(previous);
    res.json({ user: selfUser(user) });
  }),
);

// Account deletion: anonymise + soft-delete so that conversations, reviews and
// audit history retain referential integrity, while personal data is removed.
usersRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.user!.id;
    const anonEmail = `deleted+${id}-${crypto.randomBytes(6).toString('hex')}@deleted.skillsplore.local`;
    const avatarKey = req.user!.avatarKey;

    await prisma.$transaction(async (tx) => {
      await tx.tutorProfile.updateMany({
        where: { userId: id },
        data: { status: 'SUSPENDED', headline: null, experience: null, teachingStyle: null },
      });
      await tx.user.update({
        where: { id },
        data: {
          email: anonEmail,
          displayName: 'Deleted user',
          bio: null,
          avatarKey: null,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          deletedAt: new Date(),
          status: 'SUSPENDED',
        },
      });
    });
    if (avatarKey) await storage.delete(avatarKey);
    await writeAudit({ actorId: id, action: 'user.delete_account', entityType: 'User', entityId: id });
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.json({ ok: true });
  }),
);
