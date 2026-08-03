# Changelog

All notable changes to SkillSplore are documented here.

## [Unreleased]

### Added (2026-08-03) — Optional LinkedIn marketing agent
New, fully independent service at `apps/marketing-agent/` (own database, own founder auth, own
Docker image/compose stack) for planning, generating, reviewing, approving, scheduling and
publishing SkillSplore's LinkedIn company-page content. The marketplace (`apps/api`, `apps/web`)
has zero runtime dependency on it — the only coupling point is one optional external nav link.
- Content lifecycle: ideas → briefs → up to 3 AI-generated draft variants → tone/claim/privacy/
  hashtag/length/duplicate warnings → human edit (versioned) → approve → schedule → publish.
- `ContentGenerationProvider` adapter (Anthropic, OpenAI-compatible, Ollama, and a network-free
  deterministic `template` mode used by demo mode and the seeded 12-post launch calendar).
- Mock LinkedIn client for demo/dev; real LinkedIn OAuth 2.0 (PKCE) + Posts API client also
  implemented but unverified against the live API (see `docs/marketing-agent/KNOWN_LIMITATIONS.md`).
- Scheduler worker with an atomic publish lock (prevents duplicate publication), bounded
  exponential backoff on transient failures.
- 19-page React dashboard; 52 automated tests (unit + integration against an isolated test DB).
- 18 docs under `docs/marketing-agent/` plus its own `README.md`/`CLAUDE.md`.

### Started (2026-08-03) — Launch-readiness sprint (Phases 1 & 4 first pass)
Began a founder-directed multi-phase audit-and-harden pass over the marketplace itself, ahead of
a controlled pilot. **Phase 1 (repository audit) complete**: added `docs/ARCHITECTURE.md`,
`docs/TECHNICAL_DEBT.md`, `docs/KNOWN_LIMITATIONS.md` (new) and updated `docs/CURRENT_STATE.md`,
all written from direct inspection of this checkout rather than intended design. Key finding: test
coverage is thin (one API test file, 21 tests; zero frontend/E2E tests) and there is no CI test
gate.
**Phase 4 (security review) first pass complete**: added `docs/SECURITY_REVIEW.md`,
`docs/THREAT_MODEL.md`, `docs/INCIDENT_RESPONSE.md`. No critical vulnerabilities found in this
pass; two Medium findings (no test gate on the currently-inert AWS deploy workflow; `multer` 1.x
CVEs), both documented with fixes and neither blocking a small controlled pilot. Several risk
categories (IDOR checks in most modules, dependency SAST, live rate-limit/session testing) are
explicitly listed as not yet checked — see the doc for the full scope statement.
**Phase 5 (data integrity/database review) complete**: added `docs/DATA_MODEL.md`,
`docs/DATA_RETENTION.md`. Real finding: `onDelete: Cascade` on several `User` relations (Review,
Report, Engagement, Message) is inconsistent with the app's actual anonymize-not-delete account
philosophy — currently dormant (the app never hard-deletes a user) but a latent data-loss risk if
that ever changes. Documented with a recommended fix; **not applied** in this pass since it's a
schema/migration change and the sprint's own hard limits require a documented migration+rollback
strategy first, not a drive-by change. No retention-period policy exists yet (business/legal
decision, flagged not decided).
**Phase 2 (user-journey audit) complete**: added `docs/USER_JOURNEY_AUDIT.md` (one table per
persona, traced against actual route/page code). Found and **fixed** one real, high-priority bug:
homepage category tiles linked to `/search?categoryId=X` but `Search.tsx` read the query param as
`category` (missing "Id"), so every homepage category click landed on an unfiltered search page —
hit real visitors on a primary homepage CTA. Fixed with a one-line change
(`apps/web/src/pages/Search.tsx`), live-verified against a running dev server (category filter and
result count now correct). Also **fixed** the second Broken item: admins had no way to browse/moderate requests proactively
(`GET /admin/requests` existed server-side with zero frontend surface; the Admin Dashboard's
"Open requests"/"Engagements"/"Completed" tiles all dead-linked back to `/admin` itself). Added
`apps/web/src/pages/admin/AdminRequests.tsx`, wired it into `App.tsx`, `AdminNav.tsx`, and
repointed the dashboard tiles — live-verified via the demo admin account. Remaining gaps from the
audit (editing a posted request, unblocking a user, reporting requests/reviews/users, request/
message file uploads, tutor response history, admin UI for pricing/launch-stage config) are
logged in `docs/USER_JOURNEY_AUDIT.md`'s "High-priority fixes needed" section, not yet built —
Partially-working, not Broken, so lower priority per the sprint's own triage order.

### Added (2026-08-03) — Phase 3: expanded automated test suite
Added 25 new API tests across two new files (`apps/api/tests/requests-and-responses.test.ts`,
`apps/api/tests/search-and-auth.test.ts`), bringing the suite from 21 to 46 tests, all passing.
New coverage: request creation/validation/edit-ownership/closed-request lock, tutor feed
subject-matching, response duplicate-prevention and re-submission after withdrawal, self-response
rejection, non-open-request rejection, accept→engagement+conversation creation, competing-rate
isolation, search's APPROVED-only/category-filter/price-filter behavior, registration (incl.
terms-required), login/logout, suspended-account enforcement on every request (not just login),
and conversation membership + symmetric blocking. Not exhaustive against the full Phase 3 priority
list (file-upload validation, prod/demo config tests, and a couple of others remain) — logged as
the next test-writing priority, not silently dropped.

### Added (2026-08-03) — Phase 6: production/demo separation hardening
Audited every place demo data, demo credentials, or reset controls could reach a production
instance. Found the separation itself was already solid (`env.ts`'s boot-time guard,
`guardDemoCommand()` in every demo script, server-side `demoLoginEnabled` check independent of the
frontend, `bootstrap.mjs` skipping seed entirely in production) — the real gap was that **none of
it was covered by automated tests**. Added `apps/api/tests/envProductionGuard.test.ts` (9 tests,
spawns the real modules as subprocesses with controlled env vars, since these guards call
`process.exit` at module load and can't be exercised in-process): verifies production refuses to
boot with demo login enabled, a weak/placeholder/short session secret, or S3 storage without
credentials, boots fine with a genuinely secure config, and that `demo:seed`/`demo:reset`/
`demo:accounts` all refuse to run under `APP_ENV=production`. Suite is now 55 tests. Wrote
`docs/ENVIRONMENTS.md` as the single reference for the three-mode model and where each guard lives.

### Changed (2026-08-03) — Repositioning: moderated learning noticeboard
Repositioned public-facing copy from a tutoring-only "marketplace" to a "moderated learning
noticeboard" spanning academic, creative and practical skills. Copy-only change — no routes,
components, database models or API paths were renamed. See `docs/PRODUCT_POSITIONING.md` and
`docs/TERMINOLOGY.md` for the reasoning and word choices.
- Rebuilt the homepage: honest pre-launch hero copy, real database-driven category grid (added a
  Cooking & Culinary Skills category), separate learner/provider "How it works" flows, no fabricated
  stats or testimonials (the `/api/reviews/featured` homepage section below was removed).
- Updated navigation and footer copy; added About and Safety pages; updated homepage title/meta.
- Copy pass across search, request creation/response, tutor profile, dashboard and onboarding pages.
- Centralized payment/pricing copy into `apps/web/src/lib/pricingCopy.ts`.
- Light terminology pass on Terms of Service and Privacy Policy (still drafts pending legal review).
- Added `docs/PRODUCT_POSITIONING.md`, `docs/TERMINOLOGY.md`, `docs/ROADMAP.md`.

### Changed
- **Rebrand:** renamed the product from Learnfolk to SkillSplore across the codebase — npm package
  names, UI copy, docs, email domains, demo account addresses, cookie name, project directory, and
  local Postgres role/database. No architecture or data-model changes.
- **Catalogue:** subject taxonomy expanded from 10 to 97 subjects across 12 categories
  (`apps/api/prisma/taxonomy.data.ts`), each with an icon for browse tiles. Seed rebuilt to populate
  it. See `docs/PRODUCT_COMPARISON.md` for the profi.ru structural comparison that motivated this.
- **Design v2:** moved off a profi.ru-shaped composition (gradient panel + dominant search + category
  grid) toward a restructured homepage — restrained hero with a subtle blurred-blob background,
  numbered "how it works" section, a subject pill-cloud, and a real-review testimonial section — set
  in Space Grotesk (display) + Inter (body) on a near-white ground with a single indigo/coral accent.
- Added `GET /api/taxonomy/overview` (category/subject list with live approved-tutor counts) and
  `GET /api/reviews/featured` (highest-rated genuine published reviews, for homepage social proof —
  never fabricated).
- Added Terms of Service and Privacy Policy pages (`/legal/terms`, `/legal/privacy`), linked from the
  footer, with an explicit "payments arranged directly, SkillSplore takes no fee" clause and a
  placeholder for professional legal review per the specification's production-preparation checklist.

## [0.1.0] — 2026-07-23

First working end-to-end MVP.

### Added
- **Sovereign foundation:** npm workspaces monorepo (Express + TypeScript API, React + Vite web),
  validated `APP_ENV` with production safety guards, adapter interfaces for email (SMTP) and object
  storage (local / S3), PostgreSQL-backed sessions, Helmet, CORS, rate limiting, central error
  handling and structured logging.
- **Data model:** complete Prisma schema and initial migration for users, roles, taxonomy, tutor
  profiles, subjects, levels, availability, qualifications, saved tutors, requests, responses,
  conversations, messages, blocks, engagements, reviews, reports, admin notes, notifications and an
  append-only audit log.
- **Authentication & accounts:** registration, email verification, login/logout, password reset,
  profile editing, avatar upload, account deletion (anonymising), terms acceptance, dual
  student/tutor roles.
- **Tutor onboarding & approval:** multi-step profile with save-progress, subjects/levels/pricing/
  availability/qualifications with private documents, preview and submit; admin review queue with
  approve/request-changes/reject/suspend, qualification verification, notes, audit and notifications.
- **Search & profiles:** real database-backed search with all documented filters/sorts, public
  profiles with accurate rates, reviews and trust indicators, save-tutor.
- **Requests, responses, messaging:** student requests lifecycle, tutor request feed, single
  response per tutor with hidden competing rates, response management, conversations and messaging
  (polling), engagements and reviews with aggregate rating, reporting and moderation.
- **Administration:** full dashboard, moderation tools, taxonomy management, audit log, statistics.
- **Demonstration:** seed/reset/accounts commands (guarded against production), fictional NZ/AU
  dataset, documented demo accounts, optional demo banner.
- **Infrastructure & handover:** Docker Compose (app + PostgreSQL + MinIO + Mailpit), production
  Dockerfile, backup/restore scripts, JSON data export, permission test suite, and the docs in this
  directory.
