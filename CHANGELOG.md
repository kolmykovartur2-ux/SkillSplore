# Changelog

All notable changes to Learnfolk are documented here.

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
