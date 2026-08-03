import { prisma } from './prisma.js';
import type { FactRef } from './contentGenerationProvider.js';

// §13 — "content generation may use only active, public-approved facts."
export async function getActiveApprovedFacts(): Promise<FactRef[]> {
  const now = new Date();
  const facts = await prisma.marketingFact.findMany({
    where: {
      isPublic: true,
      validFrom: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { factKey: 'asc' },
  });
  return facts.map((f) => ({ key: f.factKey, value: f.value, source: f.source }));
}
