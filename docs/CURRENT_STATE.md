# Current state

_Last updated: 2026-08-03_

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
- Automated tests covering critical permission rules (all passing).

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
