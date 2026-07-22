import { prisma } from '../../lib/prisma.js';

// Recomputes a tutor's aggregate rating from PUBLISHED reviews only, so hidden/
// moderated reviews never affect the public average.
export async function recomputeTutorRating(tutorProfileId: number): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { tutorProfileId, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: {
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0,
      ratingCount: agg._count._all,
    },
  });
}
