import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

// Append-only audit trail. actorId has no FK so the trail survives even if
// the admin account is later removed. Records everything listed in spec §27:
// connection changes, token revocation, draft approval/withdrawal, schedule
// changes, publication/failure, post deletion, fact approval, consent
// changes, admin configuration changes.
export async function writeAudit(input: {
  actorId?: number | null;
  action: string;
  entityType?: string;
  entityId?: number;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}
