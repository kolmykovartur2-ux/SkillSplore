# Data model review

_Direct review of `apps/api/prisma/schema.prisma` (27 models, 13 enums, 5 migrations), 2026-08-03._

## Conventions (consistent throughout)

- `Int @id @default(autoincrement())` everywhere — no UUIDs.
- No blanket soft-delete flag. Lifecycle is per-entity nullable `DateTime?` columns: `deletedAt`,
  `suspendedAt`, `hiddenAt`, `publishedAt`, `closedAt`, `completedAt`, `cancelledAt`,
  `resolvedAt`, `verifiedAt`, `archivedAt`, `lockedUntil`.
- Money: `*Cents Int` + a separate `currency` string — never a float. Correct pattern, no findings.
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` where the row
  is ever mutated. Consistent.
- Duplicate-prevention via DB constraints, not just application logic:
  `Review.engagementId @unique` (one review per engagement), `RequestResponse
  @@unique([requestId, tutorProfileId])` (one active response per tutor per request),
  `ConversationParticipant @@unique([conversationId, userId])`, `Block
  @@unique([blockerId, blockedId])`. 31 total `@@index`/`@@unique` declarations — reasonable
  coverage on FK and status columns used in real queries (spot-checked search/admin queries
  against this list, not exhaustively benchmarked — see `docs/PERFORMANCE.md` for query-level
  review).

## Finding: `onDelete: Cascade` on User relations is inconsistent with the app's actual delete philosophy

**Severity: Medium. Not currently exploitable — the app never hard-deletes a user — but a latent
risk if that ever changes. Non-blocking for pilot; worth fixing before any GDPR-style "right to
erasure" hard-delete feature is ever added.**

`users.routes.ts`'s `DELETE /api/users/me` (and equivalent) anonymizes the account in place
(scrambles email/display name, sets `deletedAt`) rather than calling `prisma.user.delete()` — this
is the correct, intentional design, and it's why reviews/messages/reports currently survive
account "deletion" as claimed in `docs/FEATURES.md`.

However, the **schema itself** doesn't enforce this. Nearly every `User` relation in
`schema.prisma` is declared `onDelete: Cascade`, including on models that represent legally or
operationally important history: `Review` (line 507), `Report` (line 529), `Engagement` (lines
477, 479), `Message` (line 451), `Conversation` participants (line 438), `RequestResponse`
(line 402), `TutoringRequest` (line 368). If a hard `prisma.user.delete()` were ever run — by a
future feature, an ad-hoc admin script, or a mistake — every review that user wrote or received,
every report they filed, every completed engagement, and every message they sent would be
**silently destroyed**, not preserved.

Compare this to `AuditLog.actorId`, which is deliberately a plain `Int?` with **no** relation at
all, specifically so the audit trail survives actor deletion (`lib/audit.ts`'s own comment states
this intent). That's the right pattern; it just wasn't applied consistently to `Review`, `Report`,
`Engagement`, and `Message`.

**Recommendation (not implemented in this pass — this is a schema/migration change and per the
sprint's own hard limits, destructive migrations need a documented strategy first, not a drive-by
fix):**
1. Decide, deliberately, whether a future hard-delete path should ever exist at all (a soft-delete
   / anonymize-only policy is simpler and arguably sufficient, and would let you just document
   "never call `.delete()` on User" as a code-review rule instead of a schema change).
2. If a real hard-delete is wanted later (e.g. for a legal erasure request), change `Review`,
   `Report`, `Engagement`, and `Message`'s `onDelete: Cascade` on the `User` relation to
   `SetNull` (requires making the FK column nullable) or `Restrict` (requires anonymizing first,
   then deleting) — either needs a migration, needs testing against existing data, and needs a
   rollback plan before running against anything with real users in it.
3. Until then, treat "never hard-delete a `User` row in production" as a hard operational rule and
   say so explicitly in `docs/OPERATIONS.md`.

## Other observations (no action needed)

- **Location precision**: `TutorProfile` stores `city`/`country` as free-text strings, no
  latitude/longitude or precise street address field found — already avoids the "exact home
  address" privacy risk called out in the sprint brief without any change needed. Confirmed
  during this pass, not previously documented explicitly.
- **Request/response status transitions**: `RequestStatus` and `ResponseStatus` enums are enforced
  at the type level by Prisma, but *valid transitions between statuses* (e.g. can't reopen a
  `CLOSED` request) are enforced in route/service code, not the database — consistent with how
  ownership checks work elsewhere in this codebase (inline, not centrally). Not exhaustively
  re-verified in this pass; flagged for the same follow-up as the IDOR check in
  `docs/SECURITY_REVIEW.md`.
- **Demo record marking**: no `isDemo`/`isFictional` column exists on any model. Demo vs.
  production is entirely an environment-level distinction (`APP_ENV`), not a row-level one — there
  is no mixed demo/production database mode, so this is consistent, not a gap. See
  `docs/ENVIRONMENTS.md` (Phase 6) for the dedicated review of this boundary.
- **Migrations**: 5 migrations (`init`, `add_category_icon`, `subject_suggestions`,
  `login_lockout`, `verifications`), applied cleanly against a fresh database and against the
  existing `skillsplore_test` database in this session (`npm test` passed, which runs
  `prisma migrate deploy` in `globalSetup` first).
- **Seed script idempotency**: `apps/api/prisma/seed.ts` was not re-run twice in this pass to
  confirm idempotency directly — flagged as unverified, not confirmed either way.
