import { Router } from 'express';
import path from 'node:path';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, isAdmin } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../lib/storage.js';
import { notFound, forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const filesRouter = Router();

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

function contentTypeFor(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}

// Fetches an object stream, translating a missing object into a 404 rather than
// a 500 (e.g. a DB row whose backing file is absent).
async function openObject(key: string) {
  try {
    return await storage.getStream(key);
  } catch {
    throw notFound('The file is no longer available.');
  }
}

// Public: avatars are non-sensitive and served by user id (keys never exposed).
filesRouter.get(
  '/avatar/:userId',
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
    if (!user?.avatarKey) throw notFound('No avatar.');
    const { stream } = await openObject(user.avatarKey);
    res.setHeader('Content-Type', contentTypeFor(user.avatarKey));
    res.setHeader('Cache-Control', 'private, max-age=300');
    stream.pipe(res);
  }),
);

// Private: qualification documents. Only the owning tutor or an administrator
// may access them. Every admin access is audit-logged.
filesRouter.get(
  '/qualification/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const qual = await prisma.qualification.findUnique({
      where: { id: Number(req.params.id) },
      include: { tutorProfile: { select: { userId: true } } },
    });
    if (!qual?.documentKey) throw notFound('No document.');

    const admin = isAdmin(req);
    const owner = qual.tutorProfile.userId === req.user!.id;
    if (!admin && !owner) throw forbidden('You cannot access this document.');

    if (admin && !owner) {
      await writeAudit({
        actorId: req.user!.id,
        action: 'qualification.document_accessed',
        entityType: 'Qualification',
        entityId: qual.id,
      });
    }

    const { stream } = await openObject(qual.documentKey);
    res.setHeader('Content-Type', contentTypeFor(qual.documentKey));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(qual.documentName ?? 'document')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    stream.pipe(res);
  }),
);
