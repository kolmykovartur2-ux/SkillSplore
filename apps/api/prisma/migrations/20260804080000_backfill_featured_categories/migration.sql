-- One-time backfill of Category.isFeatured.
--
-- 20260804060000_taxonomy_expansion added isFeatured with DEFAULT false, and
-- syncTaxonomy only sets it when it CREATES a category. On any database that
-- already had categories -- which is every existing deployment, including
-- production -- every row therefore stayed false, and /taxonomy/overview
-- (which returns only featured categories) would have returned an empty list,
-- rendering a homepage with no category tiles at all.
--
-- This is done as a migration rather than by changing the sync on purpose.
-- The sync runs on every boot, so if it asserted these values it would also
-- silently re-feature a category an administrator had deliberately unfeatured.
-- A migration runs exactly once, which is the correct semantics for "seed the
-- initial state" as opposed to "enforce this state forever".
--
-- Matched on normalizedName so the statement is not sensitive to punctuation
-- or casing drift in the display name. Categories not present are simply not
-- updated -- there is no insert here.

UPDATE "Category"
SET "isFeatured" = true
WHERE "normalizedName" IN (
  'languages',
  'mathematics',
  'computer science it',
  'music',
  'business economics',
  'arts design',
  'sports fitness',
  'cooking culinary skills',
  'trades practical skills',
  'data ai automation',
  'career workplace development',
  'photography video content creation'
);
