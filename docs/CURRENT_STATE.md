# Current state

_Last updated: 2026-08-03_

> This file summarizes state. `docs/ARCHITECTURE.md` describes structure in depth,
> `docs/TECHNICAL_DEBT.md` and `docs/KNOWN_LIMITATIONS.md` list what's weak or missing,
> `docs/SECURITY_REVIEW.md` / `docs/THREAT_MODEL.md` / `docs/INCIDENT_RESPONSE.md` cover security,
> `docs/DATA_MODEL.md` / `docs/DATA_RETENTION.md` cover the database, and
> `docs/USER_JOURNEY_AUDIT.md` (Phase 2, in progress) will track every user-facing flow
> individually. All were written from direct inspection of this checkout, not from the original
> design intent. This is a **launch-readiness sprint in progress** — see `CHANGELOG.md` for
> per-phase status.

## Summary

SkillSplore is a **working, end-to-end MVP** and is **pre-launch**. All primary journeys operate
against a real PostgreSQL database with real authentication and permissions. The same codebase runs
the demonstration and would run production; the two differ only in configuration, seed data,
external adapters and security settings.

Public-facing copy positions SkillSplore as a **moderated learning noticeboard** — not a
"marketplace" — spanning academic tutoring, music, art, languages, technology, business and
practical skills. See [`PRODUCT_POSITIONING.md`](PRODUCT_POSITIONING.md) and
[`TERMINOLOGY.md`](TERMINOLOGY.md). Internally, and in the database/API (`TutorProfile`,
`/api/tutors/*`, etc.), the original tutoring-marketplace naming remains unchanged — this was a
copy-only repositioning, not a schema or route rename.

## What works

- Dual operating modes with an explicit, validated `APP_ENV`. Production start-up fails on insecure
  demo settings.
- Full authentication (register, verify, login/logout, reset, sessions, profile, avatar, delete).
- Tutor onboarding, admin approval workflow, secure private qualification documents.
- Real database-backed tutor search with all documented filters and sorts.
- Direct enquiry, messaging (polling), requests, tutor responses (with hidden competing rates),
  student response management, engagements, reviews, reporting and moderation.
- A complete admin dashboard, audit logging and platform statistics.
- Demonstration seed / reset / accounts commands (guarded against production).
- Docker Compose stack: app + PostgreSQL + MinIO + Mailpit.
- Portable backup / restore / JSON export.
- Automated tests: **55 tests across 4 files** (`permissions.test.ts` 21,
  `requests-and-responses.test.ts` 15, `search-and-auth.test.ts` 10,
  `envProductionGuard.test.ts` 9) — up from 1 file/21 tests as of the start of the 2026-08-03
  launch-readiness sprint. Covers permissions, request/response lifecycle + duplicate prevention,
  search filtering, registration/login/logout/suspension, messaging membership/blocking, and the
  production-vs-demo boot guards. Still zero frontend tests and zero E2E tests — see
  `docs/TECHNICAL_DEBT.md`.
- An optional, fully separate LinkedIn marketing agent (`apps/marketing-agent/`) — own database,
  own auth, own Docker stack. The marketplace does not depend on it; see
  `apps/marketing-agent/README.md`.

## Verified

- `npm run typecheck` passes for API and web.
- `npm test` (API) — 21 permission/behaviour tests pass against an isolated `skillsplore_test` DB.
- Demonstration data seeds cleanly; the app renders real data (home, search, tutor profiles,
  admin dashboard with accurate statistics) in the browser.
- API smoke-tested end to end (health, config, registration, search, admin, auth/session).

## Known limitations / remaining work before real users

These are deliberately **not** claimed as done. See `docs/SECURITY.md` for detail.

- Independent penetration testing.
- Final legal review; the terms/privacy content are placeholders for professional review.
- Privacy impact review.
- Production monitoring/alerting and log aggregation.
- Production email-domain verification (SPF/DKIM/DMARC) with a real SMTP provider.
- Formal incident-response process.
- Load testing and a shared rate-limit store (e.g. Redis) if scaling beyond one node.
- Additional moderation staffing/process.
- Real-time messaging (currently polling) if desired — optional.
- Malware scanning of uploaded documents (basic type/size validation is in place).
- Revenue/pricing model is not finalised — no fees are charged or promised anywhere in the product.
- No monitored public contact address exists yet, so the footer deliberately omits a "Contact" link
  rather than publish a placeholder — founder decision needed.

## Environment notes for this checkout

- Node 20+ (developed against Node 24), PostgreSQL 17.
- Local `DATABASE_URL` expects a `skillsplore` role/database; tests use `skillsplore_test`.
- Passwords are hashed with bcrypt (pure-JS, no native build toolchain required). Argon2 is a
  documented future hardening option.
