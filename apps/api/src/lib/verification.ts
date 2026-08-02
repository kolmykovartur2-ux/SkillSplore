import type { VerificationType } from '@prisma/client';

// Exact public-facing wording per check type -- an admin can override this,
// but this is what gets used by default so labels stay consistent. Never a
// generic "Verified" -- each badge states specifically what was checked.
export const DEFAULT_VERIFICATION_LABELS: Record<VerificationType, string> = {
  IDENTITY_DOCUMENT: 'Identity checked',
  QUALIFICATION_DOCUMENT: 'Qualification document checked',
  EMAIL_CONFIRMED: 'Email confirmed',
};

export interface VerificationSummary {
  type: VerificationType;
  label: string;
  checkedAt: Date;
  expiresAt: Date | null;
}

// Only records that are neither revoked nor expired are ever shown publicly.
export function activeVerifications(
  records: Array<{ type: VerificationType; label: string; checkedAt: Date; expiresAt: Date | null; revokedAt: Date | null }>,
): VerificationSummary[] {
  const now = new Date();
  return records
    .filter((r) => !r.revokedAt && (!r.expiresAt || r.expiresAt > now))
    .map((r) => ({ type: r.type, label: r.label, checkedAt: r.checkedAt, expiresAt: r.expiresAt }));
}
