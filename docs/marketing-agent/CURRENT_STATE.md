# Current state

_Last updated: 2026-08-03_

## Summary

The marketing agent is a working, self-hostable service through Phase 5 of `ROADMAP.md`:
foundation, content lifecycle (ideas → briefs → drafts → campaigns → facts → consents → media),
all four `ContentGenerationProvider` adapters (including the network-free `template` mode),
versioning/approval/scheduling, and a mock-LinkedIn demo mode with simulated publish and
analytics. Phase 6 (real LinkedIn OAuth + Posts API) is also implemented, but has not been
exercised against the live LinkedIn API in this build environment — see `KNOWN_LIMITATIONS.md`.

## What works

- Own database (Prisma schema covering every entity in the spec's §27 list), own founder
  auth (bcrypt + PostgreSQL-backed sessions), own Docker image and compose stack.
- Full content pipeline: idea → brief → up to 3 AI-generated (or template-generated) draft
  variants → deterministic tone/claim/privacy/hashtag/length/duplicate warnings → human edit
  (new version every time) → approve → schedule (with cadence-conflict warnings) → publish.
- `template` provider mode needs no AI vendor and no network access, and is what demo mode and
  the seeded 12-post launch calendar run on.
- Mock LinkedIn client: simulated publish (fake URN) and simulated, clearly-labelled
  (`isSimulated: true`) analytics.
- Real LinkedIn OAuth 2.0 + PKCE flow and Posts API publish/analytics client are implemented
  (`src/lib/linkedin/{oauth,realClient}.ts`), gated behind `LINKEDIN_PUBLISHING_ENABLED` +
  `MOCK_LINKEDIN_API=false`, off by default.
- Scheduler worker: atomic publish lock (conditional `UPDATE ... WHERE status='SCHEDULED'`),
  bounded exponential backoff for transient failures, immediate `FAILED` for permanent ones,
  manual retry.
- Dashboard: Overview, Calendar (month grid), Ideas, Briefs, Drafts, Draft editor (versions,
  warnings, approve/request-changes/schedule/publish-now/retry/duplicate/cancel/archive), Review
  queue, Scheduled/Published/Failed views, Campaigns, Pillars, Facts, Media library, Consents,
  LinkedIn connection status, Analytics, Audit log, Settings.
- Persona-targeted image generation for post creative (`IMAGE_AI_PROVIDER`, default `none`):
  `openai_compatible` or fully self-hosted `automatic1111`. Prompts are built server-side by a
  pure, unit-tested function carrying non-bypassable safety constraints (no real people, no minors,
  no on-image text/statistics, no logos, no outcome claims). Generated assets record full
  provenance and show an **AI-generated** badge. See `IMAGE_GENERATION.md`.
- Export endpoints: full JSON dump, CSV for drafts and analytics.
- One-click LinkedIn disconnect: wipes stored tokens, preserves historical published-post
  records.

## Verified in this environment

- `npm run typecheck` passes with zero errors for both the API (`apps/marketing-agent`) and the
  dashboard (`apps/marketing-agent/web`).
- The existing marketplace's own `npm run typecheck` and `npm test` (run from the repo root)
  were confirmed to still pass unaffected by this addition — see the root `docs/CURRENT_STATE.md`
  companion note.

## Known gaps (see `KNOWN_LIMITATIONS.md` for the full list)

- Real LinkedIn OAuth/Posts API/analytics code is written but **untested against the live API**
  (no outbound network access in the build environment that produced it).
- Calendar is a read-only month grid; no drag-and-drop rescheduling yet (reschedule via
  unschedule + schedule on the draft page).
- Generated images are not automatically checked against the safety constraints — image models
  ignore instructions occasionally (stray text most often), so founder review before approval is
  the control.
- No automated administrator alert channel (email/Slack) on final publish failure — currently a
  loud log line only.
- No penetration test, no formal incident-response rehearsal, no load testing.
