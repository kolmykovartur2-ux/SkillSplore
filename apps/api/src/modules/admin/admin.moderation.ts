import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { recomputeTutorRating } from '../reviews/reviews.service.js';
import type { ReportEntityType } from '@prisma/client';

// Hides a piece of content by type, applying the appropriate state change.
export async function hideContent(entityType: ReportEntityType, entityId: number): Promise<void> {
  switch (entityType) {
    case 'REVIEW': {
      const review = await prisma.review.update({
        where: { id: entityId },
        data: { status: 'HIDDEN' },
        select: { tutorProfileId: true },
      });
      await recomputeTutorRating(review.tutorProfileId);
      break;
    }
    case 'MESSAGE':
      await prisma.message.update({ where: { id: entityId }, data: { hiddenAt: new Date() } });
      break;
    case 'REQUEST':
      await prisma.tutoringRequest.update({ where: { id: entityId }, data: { hiddenAt: new Date() } });
      break;
    case 'TUTOR_PROFILE':
      await prisma.tutorProfile.update({ where: { id: entityId }, data: { status: 'SUSPENDED' } });
      break;
    case 'USER':
      await prisma.user.update({
        where: { id: entityId },
        data: { status: 'SUSPENDED', suspendedAt: new Date() },
      });
      break;
    default:
      throw badRequest('Unsupported content type.');
  }
}

// Loads the reported entity plus enough surrounding context for an admin to
// make a decision.
export async function loadReportContext(entityType: ReportEntityType, entityId: number): Promise<unknown> {
  switch (entityType) {
    case 'REVIEW':
      return prisma.review.findUnique({
        where: { id: entityId },
        include: {
          student: { select: { id: true, displayName: true } },
          tutorProfile: { include: { user: { select: { id: true, displayName: true } } } },
        },
      });
    case 'MESSAGE':
      return prisma.message.findUnique({
        where: { id: entityId },
        include: { sender: { select: { id: true, displayName: true } } },
      });
    case 'REQUEST':
      return prisma.tutoringRequest.findUnique({
        where: { id: entityId },
        include: { student: { select: { id: true, displayName: true } }, subject: true },
      });
    case 'TUTOR_PROFILE':
      return prisma.tutorProfile.findUnique({
        where: { id: entityId },
        include: { user: { select: { id: true, displayName: true, email: true } } },
      });
    case 'USER':
      return prisma.user.findUnique({
        where: { id: entityId },
        select: { id: true, displayName: true, email: true, status: true, createdAt: true },
      });
    default:
      return null;
  }
}
