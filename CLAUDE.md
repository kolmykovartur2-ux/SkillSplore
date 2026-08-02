# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## What this product is

SkillSplore is a **moderated learning noticeboard**, not a "marketplace" in public-facing copy.
Read [`docs/PRODUCT_POSITIONING.md`](docs/PRODUCT_POSITIONING.md) and
[`docs/TERMINOLOGY.md`](docs/TERMINOLOGY.md) before writing or editing any user-facing text. They
define the positioning statement, which words to use where, and which claims require real evidence
before they can be published (no fabricated counts, no "0% fees", no unverified "Verified" badges,
no permanent pricing promises — the revenue model isn't finalised yet).

SkillSplore is **pre-launch**. Copy should say "Launching soon" / "Join the early community", not
imply an established large platform, and never invent activity, users, reviews or results.

## Codebase orientation

- `apps/api` — Express + TypeScript + Prisma REST API. `apps/api/prisma/schema.prisma` is the
  source of truth; hand-write migration SQL in `apps/api/prisma/migrations/` (this environment has
  no interactive TTY, so `prisma migrate dev` can't run — write the SQL directly, matching Prisma's
  migration format, then apply with `prisma migrate deploy`).
- `apps/web` — React + Vite + React Router SPA.
- `apps/marketing-agent/` and `docs/marketing-agent/` — a **separate, optional, self-contained**
  service (own database, own auth, own Docker image) for LinkedIn content planning. It is wired into
  the main app only via one optional admin nav link gated behind `VITE_MARKETING_AGENT_URL`. Treat it
  as out of scope unless a task specifically concerns it.
- `docs/` — positioning, terminology, current state, security, deployment, features, roadmap.

## Naming: copy vs. code

A prior repositioning pass (2026-08-03) changed public-facing **copy only** — nav labels, headings,
button text, meta tags. It deliberately did **not** rename routes, component filenames, Prisma
models, or API paths, which still use the original tutoring-marketplace names:

- Routes: `/tutor/onboarding`, `/tutors/:id`, `/tutor/feed`
- Components: `TutorCard.tsx`, `TutorProfile.tsx`
- Prisma models: `TutorProfile`, `TutorSubject`, `TutorProfileStatus`
- API paths: `/api/tutors/*`

Don't be confused by this mismatch — it's intentional. If a future task wants the underlying names
changed too, that's a larger, separately-scoped rename, not something to do incidentally.

## Ground rules

- Preserve working authentication, database, messaging and request flows. Don't replace real
  functionality with static mock-ups.
- Keep demo data strictly separated from production data (`APP_ENV` gates seeding —
  `apps/api/prisma/bootstrap.mjs` only seeds when the database is empty and `APP_ENV !== 'production'`).
- Use incremental, hand-written Prisma migrations — never edit an already-applied migration.
- Keep the app Docker-compatible and self-hostable: PostgreSQL as the source of truth, generic SMTP
  for email, S3-compatible or local object storage. No proprietary platform dependency, and no AI
  service (Claude, Anthropic or otherwise) as a runtime requirement.
- Preserve mobile responsiveness (test at the `mobile` preset, not just desktop).
- Add or update automated tests (`apps/api/tests/permissions.test.ts`) for changed functionality
  that touches permissions, data visibility, or business rules.
- Update documentation after implementation — at minimum `docs/CURRENT_STATE.md` and
  `CHANGELOG.md`.
