/**
 * Enforcement for the message-privacy promise in the Privacy Policy (s7).
 *
 * The policy says authorised personnel may read private messages only on
 * specific grounds, and that every such access is logged with the reason. This
 * module is what makes that true rather than aspirational: there is no code
 * path that returns message content to an administrator without going through
 * `logModeratorMessageAccess` first, and the function has no default ground
 * and no optional reason.
 *
 * Deliberately NOT a middleware. A middleware is easy to forget to attach; a
 * function that returns the data you need is not.
 */
import type { PrismaClient } from '@prisma/client';

/** The permitted grounds, matching the list published in the Privacy Policy. */
export const ACCESS_GROUNDS = [
  'support',        // Responding to a support request
  'report',         // Investigating a report
  'fraud',          // Preventing fraud
  'rules',          // Enforcing the platform rules
  'security',       // Responding to a security incident
  'legal',          // Meeting a legal obligation
  'serious-harm',   // Protecting someone from serious harm
] as const;

export type AccessGround = (typeof ACCESS_GROUNDS)[number];

export function isAccessGround(value: string): value is AccessGround {
  return (ACCESS_GROUNDS as readonly string[]).includes(value);
}

export class InvalidAccessGroundError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not a permitted ground for accessing private messages. `
      + `Permitted grounds: ${ACCESS_GROUNDS.join(', ')}.`,
    );
    this.name = 'InvalidAccessGroundError';
  }
}

export interface ModeratorAccessInput {
  moderatorId: number;
  ground: string;
  /** Free text. Required -- "why this conversation, right now". */
  reason: string;
  conversationId?: number;
  messageId?: number;
  targetUserId?: number;
  reportId?: number;
}

/**
 * Records an access and returns the log id.
 *
 * Throws on an invalid ground or an empty reason. Both are hard failures on
 * purpose: an unexplained access is precisely the thing the log exists to
 * prevent, so failing closed is the correct behaviour even though it means an
 * administrator occasionally has to re-submit with a real reason.
 */
export async function logModeratorMessageAccess(
  prisma: PrismaClient,
  input: ModeratorAccessInput,
): Promise<number> {
  if (!isAccessGround(input.ground)) throw new InvalidAccessGroundError(input.ground);

  const reason = input.reason?.trim() ?? '';
  if (reason.length < 10) {
    throw new Error('A written reason of at least 10 characters is required to access private message content.');
  }

  const row = await prisma.moderatorAccessLog.create({
    data: {
      moderatorId: input.moderatorId,
      ground: input.ground,
      reason,
      conversationId: input.conversationId ?? null,
      messageId: input.messageId ?? null,
      targetUserId: input.targetUserId ?? null,
      reportId: input.reportId ?? null,
    },
  });

  return row.id;
}
