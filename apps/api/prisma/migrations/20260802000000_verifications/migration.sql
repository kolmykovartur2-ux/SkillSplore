-- Real verification records, replacing the ad-hoc "verified: !!qualification.verifiedAt"
-- boolean. Public labels must state exactly what was checked, never a generic badge.

CREATE TYPE "VerificationType" AS ENUM ('IDENTITY_DOCUMENT', 'QUALIFICATION_DOCUMENT', 'EMAIL_CONFIRMED');

CREATE TABLE "Verification" (
    "id" SERIAL NOT NULL,
    "tutorProfileId" INTEGER NOT NULL,
    "type" "VerificationType" NOT NULL,
    "label" TEXT NOT NULL,
    "evidenceRef" TEXT,
    "reviewedById" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Verification_tutorProfileId_idx" ON "Verification"("tutorProfileId");

ALTER TABLE "Verification" ADD CONSTRAINT "Verification_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: existing verified qualifications become real verification records
-- instead of silently losing that history.
INSERT INTO "Verification" ("tutorProfileId", "type", "label", "evidenceRef", "reviewedById", "checkedAt")
SELECT q."tutorProfileId", 'QUALIFICATION_DOCUMENT', 'Qualification document checked', q."title", q."verifiedById", q."verifiedAt"
FROM "Qualification" q
WHERE q."verifiedAt" IS NOT NULL AND q."verifiedById" IS NOT NULL;
