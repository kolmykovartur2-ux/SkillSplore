import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { isAdmin } from '../../middleware/auth.js';
import { uploadDocument } from '../../lib/upload.js';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../lib/storage.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  updateTutorSchema,
  subjectsSchema,
  levelsSchema,
  availabilitySchema,
  qualificationSchema,
} from './tutors.schemas.js';
import * as tutors from './tutors.service.js';

export const tutorsRouter = Router();

// --- Onboarding (owner) ----------------------------------------------------

tutorsRouter.post(
  '/apply',
  requireAuth,
  asyncHandler(async (req, res) => {
    await tutors.getOrCreateProfile(req.user!.id);
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.status(201).json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: profile ? tutors.serializeOwnProfile(profile) : null });
  }),
);

async function myProfileId(userId: number): Promise<number> {
  const p = await prisma.tutorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!p) throw badRequest('Start your tutor profile first.');
  return p.id;
}

tutorsRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateTutorSchema }),
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    await prisma.tutorProfile.update({ where: { id }, data: req.body });
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.put(
  '/me/subjects',
  requireAuth,
  validate({ body: subjectsSchema }),
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    const subjectIds = req.body.subjects.map((s: { subjectId: number }) => s.subjectId);
    const existing = await prisma.subject.count({ where: { id: { in: subjectIds } } });
    if (existing !== new Set(subjectIds).size) throw badRequest('One or more subjects are invalid.');

    await prisma.$transaction([
      prisma.tutorSubject.deleteMany({ where: { tutorProfileId: id } }),
      prisma.tutorSubject.createMany({
        data: req.body.subjects.map((s: { subjectId: number; priceCents?: number | null }) => ({
          tutorProfileId: id,
          subjectId: s.subjectId,
          priceCents: s.priceCents ?? null,
        })),
      }),
    ]);
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.put(
  '/me/levels',
  requireAuth,
  validate({ body: levelsSchema }),
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    await prisma.tutorProfile.update({
      where: { id },
      data: { levels: { set: req.body.levelIds.map((lid: number) => ({ id: lid })) } },
    });
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.put(
  '/me/availability',
  requireAuth,
  validate({ body: availabilitySchema }),
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    await prisma.$transaction([
      prisma.availabilitySlot.deleteMany({ where: { tutorProfileId: id } }),
      prisma.availabilitySlot.createMany({
        data: req.body.slots.map((s: { dayOfWeek: number; startMinute: number; endMinute: number }) => ({
          tutorProfileId: id,
          ...s,
        })),
      }),
    ]);
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.post(
  '/me/qualifications',
  requireAuth,
  uploadDocument.single('document'),
  validate({ body: qualificationSchema }),
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    let documentKey: string | undefined;
    let documentName: string | undefined;
    if (req.file) {
      const stored = await storage.put('qualifications', req.file.originalname, req.file.buffer, req.file.mimetype);
      documentKey = stored.key;
      documentName = req.file.originalname;
    }
    await prisma.qualification.create({
      data: {
        tutorProfileId: id,
        title: req.body.title,
        institution: req.body.institution,
        year: req.body.year,
        documentKey,
        documentName,
      },
    });
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.status(201).json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.delete(
  '/me/qualifications/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profileId = await myProfileId(req.user!.id);
    const qual = await prisma.qualification.findUnique({ where: { id: Number(req.params.id) } });
    if (!qual || qual.tutorProfileId !== profileId) throw notFound();
    if (qual.documentKey) await storage.delete(qual.documentKey);
    await prisma.qualification.delete({ where: { id: qual.id } });
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(profile!) });
  }),
);

tutorsRouter.get(
  '/me/preview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    if (!profile) throw notFound();
    res.json({ profile: await tutors.serializePublicProfile(profile) });
  }),
);

tutorsRouter.post(
  '/me/submit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await tutors.loadFullProfileByUser(req.user!.id);
    if (!profile) throw badRequest('Start your tutor profile first.');
    if (!['DRAFT', 'CHANGES_REQUESTED', 'PAUSED'].includes(profile.status)) {
      throw badRequest(`A ${profile.status.toLowerCase()} profile cannot be submitted.`);
    }
    tutors.assertSubmittable(profile);
    await prisma.tutorProfile.update({
      where: { id: profile.id },
      data: { status: 'PENDING', submittedAt: new Date(), changeRequestNote: null },
    });
    await writeAudit({ actorId: req.user!.id, action: 'tutor.submitted', entityType: 'TutorProfile', entityId: profile.id });
    const updated = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(updated!) });
  }),
);

tutorsRouter.post(
  '/me/pause',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    const profile = await prisma.tutorProfile.findUniqueOrThrow({ where: { id } });
    if (profile.status !== 'APPROVED') throw badRequest('Only an approved profile can be paused.');
    await prisma.tutorProfile.update({ where: { id }, data: { status: 'PAUSED' } });
    const full = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(full!) });
  }),
);

tutorsRouter.post(
  '/me/resume',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = await myProfileId(req.user!.id);
    const profile = await prisma.tutorProfile.findUniqueOrThrow({ where: { id } });
    if (profile.status !== 'PAUSED') throw badRequest('Only a paused profile can be resumed.');
    await prisma.tutorProfile.update({ where: { id }, data: { status: 'APPROVED' } });
    const full = await tutors.loadFullProfileByUser(req.user!.id);
    res.json({ profile: tutors.serializeOwnProfile(full!) });
  }),
);

// --- Saved tutors (student) ------------------------------------------------

tutorsRouter.get(
  '/saved',
  requireAuth,
  asyncHandler(async (req, res) => {
    const saved = await prisma.savedTutor.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { tutorProfile: { include: tutors.fullProfileInclude } },
    });
    const list = await Promise.all(
      saved
        .filter((s) => s.tutorProfile.status === 'APPROVED')
        .map(async (s) => await tutors.serializePublicProfile(s.tutorProfile)),
    );
    res.json({ tutors: list });
  }),
);

// --- Public profile --------------------------------------------------------

tutorsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw notFound();
    const profile = await prisma.tutorProfile.findUnique({ where: { id }, include: tutors.fullProfileInclude });
    if (!profile) throw notFound();

    const viewerOwns = req.user?.id === profile.userId;
    const admin = isAdmin(req);
    // Unapproved profiles are never public.
    if (profile.status !== 'APPROVED' && !viewerOwns && !admin) throw notFound();

    const shaped = await tutors.serializePublicProfile(profile);
    let isSaved = false;
    if (req.user) {
      isSaved = !!(await prisma.savedTutor.findUnique({
        where: { studentId_tutorProfileId: { studentId: req.user.id, tutorProfileId: id } },
      }));
    }
    res.json({ profile: { ...shaped, isSaved } });
  }),
);

tutorsRouter.post(
  '/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const profile = await prisma.tutorProfile.findUnique({ where: { id } });
    if (!profile || profile.status !== 'APPROVED') throw notFound();
    if (profile.userId === req.user!.id) throw badRequest('You cannot save your own profile.');
    await prisma.savedTutor.upsert({
      where: { studentId_tutorProfileId: { studentId: req.user!.id, tutorProfileId: id } },
      create: { studentId: req.user!.id, tutorProfileId: id },
      update: {},
    });
    res.json({ ok: true, isSaved: true });
  }),
);

tutorsRouter.delete(
  '/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.savedTutor.deleteMany({ where: { studentId: req.user!.id, tutorProfileId: id } });
    res.json({ ok: true, isSaved: false });
  }),
);
