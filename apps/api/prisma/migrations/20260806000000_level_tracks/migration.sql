-- Teaching levels split into an academic and a professional track.
--
-- Every tutor had to pick from one NCEA-shaped list to submit a profile, so an
-- SEO or welding tutor could only describe themselves as a school year or as
-- "Adult / Hobby". This adds the vocabulary that was missing and records which
-- vocabulary each category actually uses.

CREATE TYPE "LevelTrack" AS ENUM ('ACADEMIC', 'PROFESSIONAL');

-- Existing levels are all school-shaped, so ACADEMIC is the correct default for
-- the backfill and no UPDATE is needed for most of them.
ALTER TABLE "TeachingLevel" ADD COLUMN "track" "LevelTrack" NOT NULL DEFAULT 'ACADEMIC';

-- "Adult / Hobby" is the one existing level that was never about school. It is
-- the option non-academic tutors were pushed towards for want of anything
-- better, so it belongs in the track that now serves them properly. Matched by
-- slug: an admin may have renamed the display name, and a rename should not
-- silently leave the level in the wrong track.
UPDATE "TeachingLevel" SET "track" = 'PROFESSIONAL' WHERE "slug" = 'adult-hobby';

-- PROFESSIONAL as the default is deliberate. Categories created at runtime
-- through the suggestion pipeline are far more often a practical skill than a
-- school subject, and the seeded academic ones are corrected by the statement
-- below. Getting it wrong in this direction shows a tutor a skill ladder for a
-- school subject, which is odd; the other direction asks a tattoo artist for
-- their NCEA level, which is what this migration exists to stop.
ALTER TABLE "Category"
  ADD COLUMN "levelTracks" "LevelTrack"[] NOT NULL DEFAULT ARRAY['PROFESSIONAL']::"LevelTrack"[];

-- Categories that are wholly or partly school curriculum. Matched on
-- normalizedName because that is the column with the uniqueness guarantee and
-- it survives casing and punctuation drift.
--
-- This is a one-time correction of existing rows, NOT something syncTaxonomy
-- reapplies on every boot: an admin who decides their Music category is
-- professional-only should keep that decision through the next deploy.
UPDATE "Category" SET "levelTracks" = ARRAY['ACADEMIC']::"LevelTrack"[]
WHERE "normalizedName" IN ('mathematics', 'sciences', 'english humanities', 'exam test prep');

UPDATE "Category" SET "levelTracks" = ARRAY['ACADEMIC', 'PROFESSIONAL']::"LevelTrack"[]
WHERE "normalizedName" IN (
  'languages',
  'computer science it',
  'music',
  'arts design',
  'engineering cad',
  'business economics',
  'writing content',
  'sports fitness',
  'performing arts dance',
  'learning accessibility support'
);
