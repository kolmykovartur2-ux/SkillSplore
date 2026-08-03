# CLAUDE.md — apps/marketing-agent

Guidance for AI assistants working in this directory specifically. It is a **separate service**
from the rest of the SkillSplore repository — read `../../CLAUDE.md` (if present) for the
marketplace, but this file governs `apps/marketing-agent/`.

## Hard boundaries — do not cross these

- **Never** add a runtime import, HTTP call, or shared database connection between this service
  and `apps/api`/`apps/web`. The one and only sanctioned coupling point is the single external
  nav link in `apps/web/src/components/AdminNav.tsx`.
- **Never** implement LinkedIn interaction via browser automation (Playwright, Selenium, stored
  cookies, a stored password). Only `src/lib/linkedin/oauth.ts` (official OAuth 2.0 + PKCE) and
  `src/lib/linkedin/realClient.ts` (official Posts/Community Management API) may talk to
  LinkedIn.
- **Never** let generated content publish without passing through the approval gate
  (`ContentDraft.status` must be `APPROVED` before `POST /schedule/drafts/:id/schedule` will
  accept it — enforced server-side in `modules/schedule/schedule.routes.ts`, not just in the UI).
- **Never** invent marketing facts, user counts, testimonials, or launch claims in generated
  content. Content generation may only read from `MarketingFact` rows that are `isPublic` and
  currently valid — see `src/lib/facts.ts`.
- **Never** write a LinkedIn access/refresh token to the database unencrypted — always through
  `src/lib/crypto.ts` (`encrypt`/`decrypt`), never logged (see the redaction list in
  `src/lib/logger.ts`).

## Conventions to follow (mirrored from `apps/api` on purpose)

- Config: single zod schema in `src/config/env.ts`, `APP_ENV`-gated, production refuses to boot
  on insecure settings (weak secrets, `MOCK_LINKEDIN_API=true`, enabling real publishing without
  credentials).
- Modules: `src/modules/<name>/<name>.routes.ts` (+ `.service.ts` for business logic), one
  `Router` per domain, mounted in `src/routes.ts`.
- Errors: throw `AppError` subclasses from `src/lib/errors.ts`; the central `errorHandler`
  middleware converts them to a consistent JSON shape.
- Every content edit creates a new `ContentVersion` row (`modules/drafts/drafts.service.ts` ->
  `addVersion`) — never mutate `ContentDraft.body` without one.
- Every sensitive action gets a `writeAudit(...)` call (`src/lib/audit.ts`).

## When asked to extend this service

- New AI provider → implement `ContentGenerationProvider` (`src/lib/contentGenerationProvider.ts`)
  in `src/lib/providers/`, select it via a new `CONTENT_AI_PROVIDER` value. Don't special-case it
  elsewhere.
- New LinkedIn post format (image/video/poll/document) → extend `PublishInput`/the Posts API
  request body in `src/lib/linkedin/realClient.ts`; keep `LinkedinClient` the single interface
  the rest of the app depends on.
- New dashboard page → mirror the existing `web/src/pages/*.tsx` pattern (hand-written
  `api.ts`/`useApi.ts`, no state library, plain CSS in `web/src/styles.css`).

## Testing

`npm test` runs against an isolated `skillsplore_marketing_test` database — never the demo or
production one. Mock the LinkedIn client in integration tests; never call the real API from
tests or CI.
