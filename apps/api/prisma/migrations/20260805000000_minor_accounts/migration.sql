-- Under-18 accounts.
--
-- A young person can hold their own account and use the platform fully. The
-- single restriction the flag carries is that their learning requests must be
-- online -- see the comment on User.isMinor in schema.prisma.
--
-- NOTE: `prisma migrate diff` also proposed dropping Category_name_trgm_idx,
-- Subject_name_trgm_idx and the "user_sessions" table. All three exist in the
-- database but not in schema.prisma, so every diff proposes removing them.
-- The trgm indexes power fuzzy subject matching; user_sessions is the
-- express-session store. Dropping any of them is destructive. Left alone.

ALTER TABLE "User" ADD COLUMN "isMinor" BOOLEAN NOT NULL DEFAULT false;
