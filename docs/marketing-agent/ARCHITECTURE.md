# Architecture

## Sovereignty boundary

The marketing agent is a second, independent full-stack application living in the same
repository as SkillSplore's marketplace. It has:

- its own PostgreSQL database (`skillsplore_marketing`, distinct from the marketplace's),
- its own Express API process (`src/index.ts`, port 4100 by default),
- its own scheduler worker process (`src/worker.ts`),
- its own React dashboard (`web/`), with its own login — a single founder/administrator account,
  not the marketplace's user/role system,
- its own Docker image and its own `docker-compose.yml`.

The marketplace's codebase (`apps/api`, `apps/web`) contains exactly one reference to this
service: an external link in the admin nav. No shared session, no shared database connection, no
shared Docker image, no import from one into the other. Deleting `apps/marketing-agent/` and its
containers leaves the marketplace unaffected; stopping the marketplace leaves this service
unaffected (draft-only workflows and demo mode need nothing from `apps/api`).

## Request flow

```
Founder's browser
   │
   ▼
web/ (React SPA, its own session cookie: skillsplore-marketing.sid)
   │  fetch('/api/...')
   ▼
src/app.ts (Express: helmet, cors, session, loadAdminUser, rate limiting)
   │
   ▼
src/routes.ts → src/modules/<domain>/*.routes.ts
   │
   ├─→ src/lib/contentGenerationProvider.ts → providers/{template,anthropic,openai_compatible,ollama}.ts
   ├─→ src/lib/linkedin/index.ts → {mockClient, realClient, notConnectedClient}
   └─→ prisma → PostgreSQL (skillsplore_marketing)

src/worker.ts (separate process)
   │  polls ContentDraft where status=SCHEDULED and scheduledFor<=now
   ▼
modules/schedule/publish.service.ts → attemptPublish() → same LinkedIn client selector
```

## Content lifecycle (state machine)

`ContentDraft.status` moves through:

```
idea → researching → draft → awaiting_review ⇄ changes_requested → approved → scheduled
  → publishing → published
                          ↘ failed (permanent, or retries exhausted) → (manual retry) → scheduled
any pre-publish state → cancelled
published | cancelled | failed → archived
```

Only `APPROVED` drafts can transition to `SCHEDULED` (enforced in
`modules/schedule/schedule.routes.ts`, not just in the UI). Only `SCHEDULED` drafts whose
`scheduledFor` has arrived can transition to `PUBLISHING`, and that transition is a single
conditional `updateMany` (`status: 'SCHEDULED' → 'PUBLISHING'`) that acts as the publish lock —
see "Duplicate-publication prevention" below.

Editing the body of an `APPROVED` or `SCHEDULED` draft always reverts it to `CHANGES_REQUESTED`
(and removes any existing schedule) — reapproval is never optional.

## Duplicate-publication prevention

`modules/schedule/publish.service.ts`'s `attemptPublish()` is the *only* code path that ever
calls a `LinkedinClient.publishPost()`. It is called from exactly two places: the manual
"publish now" button and the worker's tick. Both go through the same conditional `updateMany`:

```ts
prisma.contentDraft.updateMany({ where: { id, status: 'SCHEDULED' }, data: { status: 'PUBLISHING' } })
```

If two callers race (a worker tick and a manual click at the same instant), only one `updateMany`
affects a row (`count === 1`); the other sees `count === 0` and returns
`already_in_progress_or_not_eligible` without calling LinkedIn. This relies on PostgreSQL's
row-level locking for a single `UPDATE ... WHERE status = 'SCHEDULED'` — no external lock service
needed.

## Provider adapters

Two adapter families, both behind a single interface each:

- `ContentGenerationProvider` (`src/lib/contentGenerationProvider.ts`) — `template` (no network),
  `anthropic`, `openai_compatible`, `ollama`. Selected by `CONTENT_AI_PROVIDER`. Runtime fallback
  (`withProviderFallback`) drops to `template` on any provider error, logging loudly rather than
  silently swapping.
- `LinkedinClient` (`src/lib/linkedin/client.ts`) — `mockClient` (demo), `realClient` (Phase 6,
  official OAuth + Posts API), `notConnectedClient` (draft-only default). Selected by
  `getLinkedinClient()` in `src/lib/linkedin/index.ts`: mock wins whenever `MOCK_LINKEDIN_API` is
  true, regardless of what else is configured, so a demo box can never accidentally hit the real
  API.

## Why a separate database instead of a shared one

A shared database would mean a marketing-agent migration, a bad query, or a connection-pool
exhaustion could degrade the marketplace. A separate `skillsplore_marketing` database (same
PostgreSQL server or a different one — both work) makes the two services' failure domains
genuinely independent, matching the requirement that stopping/removing this service never
affects the marketplace.
