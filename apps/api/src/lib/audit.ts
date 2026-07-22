import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

// Append-only audit trail for security- and moderation-sensitive actions.
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
