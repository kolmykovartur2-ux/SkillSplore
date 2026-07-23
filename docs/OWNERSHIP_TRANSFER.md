# Ownership transfer

This document lets a future owner (a new developer, an acquiring company, or an investor's technical
team) take **full control** of SkillSplore. The platform is deliberately built so that no personal
account, proprietary service, or original author is required to run, host, modify or sell it.

## What you receive

- The complete source code (API + web) in one repository, buildable from a clean checkout.
- The database schema and migration history (`apps/api/prisma`).
- Infrastructure as code: `docker-compose.yml` and `Dockerfile`.
- Operational scripts: seed/reset/accounts, backup/restore, JSON export.
- Documentation in `docs/` and this transfer guide.

## Nothing proprietary is required

SkillSplore runs on:

- **PostgreSQL** (standard, any host or managed service)
- **Generic SMTP** for email (any provider)
- **Local disk or any S3-compatible** object storage

It does **not** require Claude, Anthropic, Supabase, Vercel, Firebase, Clerk, Auth0, a paid search
API, a paid maps API, or a payment provider. The source contains no personal-account assumptions.

## Step-by-step handover

1. **Take the code.** Clone/transfer the repository to your own version control. There is no
   dependency on any preview URL or hosted build.
2. **Stand it up.** Follow `README.md` (Docker or local). Confirm you can seed and use every journey.
3. **Move the data.** Take a database dump and object-storage copy from the current host
   (`docs/DATA_EXPORT.md`), then restore into your infrastructure. A portable JSON export is also
   available via `npm run export`.
4. **Rotate all secrets.** Generate a new `SESSION_SECRET`, new database credentials, new SMTP and
   storage credentials. Remove any demo credentials.
5. **Reassign infrastructure.** Point DNS at your server, provision your own PostgreSQL, storage,
   SMTP and TLS. Nothing is tied to the previous owner's accounts.
6. **Verify.** Run `npm run typecheck`, `npm test`, apply migrations, and complete the
   demonstration acceptance sequence in the spec end to end.
7. **Own it.** You can now continue development, hire independent developers, add mobile apps, add
   payment processing, migrate providers, license, or resell — all from this codebase.

## Licensing of dependencies

All third-party dependencies and their licences are catalogued in `docs/LICENSES.md`. Regenerate the
catalogue after dependency changes (instructions in that file). Review it before any resale or
relicensing.

## Key files to know

| Area | Location |
| --- | --- |
| Environment & safety guards | `apps/api/src/config/env.ts` |
| Auth & central authorisation | `apps/api/src/modules/auth`, `apps/api/src/middleware/auth.ts` |
| Data model & migrations | `apps/api/prisma/` |
| Email / storage adapters | `apps/api/src/lib/mailer.ts`, `apps/api/src/lib/storage.ts` |
| Demonstration data | `apps/api/prisma/seed.ts` |
| Backup / restore / export | `scripts/`, `apps/api/prisma/export.ts` |
| Frontend | `apps/web/src/` |

## Before accepting real users

Complete the outstanding items in `docs/SECURITY.md` (penetration test, legal/privacy review,
monitoring, email-domain verification, incident response, load testing). Do not represent the
platform as secure, legally approved, or production-certified until those reviews have occurred.
