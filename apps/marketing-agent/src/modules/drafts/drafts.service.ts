import { prisma } from '../../lib/prisma.js';
import type { EditorType, Prisma } from '@prisma/client';

type Client = typeof prisma | Prisma.TransactionClient;

// Every save creates a new immutable version — nothing is ever overwritten
// in place (§16 step 4, §27 content_versions). Accepts an optional
// transaction client so callers already inside a `prisma.$transaction(...)`
// (e.g. drafts.routes.ts's PATCH handler) keep this atomic and on a single
// connection, rather than opening separate connections mid-transaction —
// which was previously causing interactive-transaction timeouts under load.
export async function addVersion(
  input: {
    draftId: number;
    content: string;
    editorType: EditorType;
    editorUserId?: number | null;
    generationRunId?: number | null;
    changeSummary?: string | null;
  },
  client: Client = prisma,
) {
  const last = await client.contentVersion.findFirst({
    where: { draftId: input.draftId },
    orderBy: { versionNumber: 'desc' },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  const version = await client.contentVersion.create({
    data: {
      draftId: input.draftId,
      versionNumber,
      content: input.content,
      editorType: input.editorType,
      editorUserId: input.editorUserId ?? null,
      generationRunId: input.generationRunId ?? null,
      changeSummary: input.changeSummary ?? null,
    },
  });
  await client.contentDraft.update({ where: { id: input.draftId }, data: { currentVersionId: version.id } });
  return version;
}

// Statuses from which a draft may still be freely edited by a human.
export const EDITABLE_STATUSES = [
  'IDEA',
  'RESEARCHING',
  'DRAFT',
  'AWAITING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'FAILED',
] as const;
