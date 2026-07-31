-- Fuzzy/duplicate-safe subject catalogue growth: normalized-name uniqueness
-- plus trigram similarity search, and a review queue for user-submitted
-- subjects instead of letting anyone create catalogue rows directly.

-- Trigram similarity search for "did you mean" autocomplete.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AddColumn (nullable first, backfilled below, then locked down)
ALTER TABLE "Category" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "Subject" ADD COLUMN "normalizedName" TEXT;

-- Backfill existing rows. New rows compute this the same way in application
-- code (apps/api/src/lib/normalize.ts) which also strips accents; the
-- existing seeded catalogue is plain ASCII so a SQL-only equivalent is
-- sufficient here.
UPDATE "Category" SET "normalizedName" = trim(lower(regexp_replace("name", '[^a-zA-Z0-9+#]+', ' ', 'g')));
UPDATE "Subject" SET "normalizedName" = trim(lower(regexp_replace("name", '[^a-zA-Z0-9+#]+', ' ', 'g')));

ALTER TABLE "Category" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "Subject" ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE UNIQUE INDEX "Category_normalizedName_key" ON "Category"("normalizedName");
CREATE UNIQUE INDEX "Subject_normalizedName_key" ON "Subject"("normalizedName");

-- Trigram indexes for fuzzy "did you mean" search.
CREATE INDEX "Category_name_trgm_idx" ON "Category" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Subject_name_trgm_idx" ON "Subject" USING GIN ("name" gin_trgm_ops);

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'MERGED', 'REJECTED');

-- CreateTable
CREATE TABLE "SubjectSuggestion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "note" TEXT,
    "suggestedCategoryId" INTEGER,
    "newCategoryName" TEXT,
    "submittedById" INTEGER NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedSubjectId" INTEGER,
    "reviewedById" INTEGER,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SubjectSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubjectSuggestion_status_idx" ON "SubjectSuggestion"("status");
CREATE INDEX "SubjectSuggestion_normalizedName_idx" ON "SubjectSuggestion"("normalizedName");

ALTER TABLE "SubjectSuggestion" ADD CONSTRAINT "SubjectSuggestion_suggestedCategoryId_fkey" FOREIGN KEY ("suggestedCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubjectSuggestion" ADD CONSTRAINT "SubjectSuggestion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectSuggestion" ADD CONSTRAINT "SubjectSuggestion_resolvedSubjectId_fkey" FOREIGN KEY ("resolvedSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubjectSuggestion" ADD CONSTRAINT "SubjectSuggestion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
