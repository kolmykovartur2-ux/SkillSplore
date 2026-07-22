import { Prisma, type Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { money, publicUser } from '../../lib/serializers.js';

// Ensures the user has a tutor profile to work on and holds the TUTOR role.
export async function getOrCreateProfile(userId: number) {
  const existing = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const roles: Role[] = user.roles.includes('TUTOR') ? user.roles : [...user.roles, 'TUTOR'];

  const [, profile] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { roles } }),
    prisma.tutorProfile.create({ data: { userId, status: 'DRAFT' } }),
  ]);
  return profile;
}

export const fullProfileInclude = {
  user: true,
  subjects: { include: { subject: { include: { category: true } } } },
  levels: { orderBy: { sortOrder: 'asc' } },
  availability: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
  qualifications: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.TutorProfileInclude;

type FullProfile = Prisma.TutorProfileGetPayload<{ include: typeof fullProfileInclude }>;

// Owner-facing view: includes private document links + editable state.
export function serializeOwnProfile(p: FullProfile) {
  return {
    id: p.id,
    status: p.status,
    headline: p.headline,
    experience: p.experience,
    teachingStyle: p.teachingStyle,
    deliveryMode: p.deliveryMode,
    country: p.country,
    city: p.city,
    locationNote: p.locationNote,
    travelRadiusKm: p.travelRadiusKm,
    availabilityNote: p.availabilityNote,
    hourlyRate: money(p.hourlyRateCents, p.currency),
    hourlyRateCents: p.hourlyRateCents,
    currency: p.currency,
    yearsExperience: p.yearsExperience,
    changeRequestNote: p.changeRequestNote,
    averageRating: p.averageRating,
    ratingCount: p.ratingCount,
    submittedAt: p.submittedAt,
    approvedAt: p.approvedAt,
    subjects: p.subjects.map((s) => ({
      subjectId: s.subjectId,
      name: s.subject.name,
      category: s.subject.category?.name ?? null,
      priceCents: s.priceCents,
      price: money(s.priceCents ?? p.hourlyRateCents, p.currency),
    })),
    levels: p.levels.map((l) => ({ id: l.id, name: l.name })),
    availability: p.availability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startMinute: a.startMinute,
      endMinute: a.endMinute,
    })),
    qualifications: p.qualifications.map((q) => ({
      id: q.id,
      title: q.title,
      institution: q.institution,
      year: q.year,
      documentName: q.documentName,
      hasDocument: !!q.documentKey,
      documentUrl: q.documentKey ? `/api/files/qualification/${q.id}` : null,
      verified: !!q.verifiedAt,
    })),
  };
}

// Public view: safe for anyone. Never exposes document keys or private notes.
export async function serializePublicProfile(p: FullProfile) {
  const [completedEngagements, reviews] = await Promise.all([
    prisma.engagement.count({ where: { tutorProfileId: p.id, status: 'COMPLETED' } }),
    prisma.review.findMany({
      where: { tutorProfileId: p.id, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { student: { select: { id: true, displayName: true, avatarKey: true } } },
    }),
  ]);
  const verifiedQualifications = p.qualifications.filter((q) => q.verifiedAt).length;

  return {
    id: p.id,
    userId: p.user.id,
    displayName: p.user.displayName,
    avatarUrl: publicUser(p.user).avatarUrl,
    headline: p.headline,
    experience: p.experience,
    teachingStyle: p.teachingStyle,
    deliveryMode: p.deliveryMode,
    country: p.country,
    city: p.city,
    locationNote: p.locationNote,
    travelRadiusKm: p.travelRadiusKm,
    availabilityNote: p.availabilityNote,
    yearsExperience: p.yearsExperience,
    currency: p.currency,
    hourlyRate: money(p.hourlyRateCents, p.currency),
    status: p.status,
    averageRating: p.averageRating,
    ratingCount: p.ratingCount,
    subjects: p.subjects.map((s) => ({
      subjectId: s.subjectId,
      name: s.subject.name,
      category: s.subject.category?.name ?? null,
      price: money(s.priceCents ?? p.hourlyRateCents, p.currency),
    })),
    levels: p.levels.map((l) => ({ id: l.id, name: l.name })),
    availability: p.availability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startMinute: a.startMinute,
      endMinute: a.endMinute,
    })),
    // Public sees that a qualification exists and whether it is verified —
    // never the underlying private document.
    qualifications: p.qualifications.map((q) => ({
      id: q.id,
      title: q.title,
      institution: q.institution,
      year: q.year,
      verified: !!q.verifiedAt,
    })),
    trustIndicators: {
      verifiedQualifications,
      completedEngagements,
      reviewCount: p.ratingCount,
      memberSince: p.user.createdAt,
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      categoryRatings: r.categoryRatings,
      createdAt: r.createdAt,
      student: publicUser(r.student),
      tutorResponse: r.tutorResponse,
      tutorRespondedAt: r.tutorRespondedAt,
    })),
  };
}

// Enforces a minimum complete profile before it can be submitted for review.
export function assertSubmittable(p: FullProfile): void {
  const problems: string[] = [];
  if (!p.headline?.trim()) problems.push('Add a headline.');
  if (!p.experience?.trim()) problems.push('Describe your experience.');
  if (!p.teachingStyle?.trim()) problems.push('Describe your teaching style.');
  if (p.subjects.length === 0) problems.push('Add at least one subject.');
  if (p.levels.length === 0) problems.push('Add at least one teaching level.');
  if (p.hourlyRateCents == null) problems.push('Set your default hourly rate.');
  if ((p.deliveryMode === 'IN_PERSON' || p.deliveryMode === 'BOTH') && (!p.country || !p.city)) {
    problems.push('Add your country and city for in-person lessons.');
  }
  if (problems.length > 0) {
    throw badRequest('Your profile is not ready to submit yet.', { problems });
  }
}

export async function loadFullProfileByUser(userId: number): Promise<FullProfile | null> {
  return prisma.tutorProfile.findUnique({ where: { userId }, include: fullProfileInclude });
}
