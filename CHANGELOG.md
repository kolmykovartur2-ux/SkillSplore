# Changelog

All notable changes to SkillSplore are documented here.

## [Unreleased]

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
