# Technical debt

_From direct inspection (2026-08-03), not a wishlist — every item here is something concretely
observed in this checkout._

## Testing (highest-impact gap)

- **One test file for the entire API**: `apps/api/tests/permissions.test.ts`, 21 tests. It covers
  permission/ownership rules well, but there is **zero direct test coverage** for: search
  filters/sorting, request/response lifecycle, conversations/messaging, engagements, reviews
  (creation, duplicate prevention, aggregate rating recompute), reports/moderation, taxonomy,
  subject-suggestion dedup, file upload validation, or the demo seed/reset/export scripts
  themselves.
- **Zero frontend tests** — no component tests, no React Testing Library, no Vitest config for
  `apps/web` at all (only `typecheck`/`lint`/`vite build` scripts exist there).
- **No browser/E2E test suite** (Playwright/Cypress) anywhere in the repo. Every "verified" claim
  in `docs/CURRENT_STATE.md` prior to this audit rested on manual smoke-testing, not automation.
- **No CI test gate.** `.github/workflows/aws.yml` is a deploy-on-push-to-master workflow with
  placeholder AWS values (currently inert) — it does not run `npm test`/`npm run typecheck`
  before deploying. If this workflow is ever activated with real AWS secrets, it would deploy
  straight to production on every push with no automated check in between. This is a real
  pre-launch risk, not just a gap — see `docs/SECURITY_REVIEW.md`.

## Infrastructure debt (mostly already self-documented in `docs/SECURITY.md`, restated here for completeness)

- In-memory rate limiting (`express-rate-limit` default store) — resets on restart, doesn't share
  state across multiple nodes. Fine for the current single-node deployment; a real constraint the
  moment horizontal scaling is needed.
- Sessions are Postgres-backed (good — survives restarts, no extra infra), but not shardable
  without a shared Postgres instance.
- No CSRF-token scheme — relies on `SameSite=Lax` cookies + CORS origin restriction. Documented as
  a known gap in `docs/SECURITY.md`; still true.
- No malware/antivirus scanning of uploaded qualification documents — MIME-type allowlist + size
  limit only.
- Passwords hashed with bcrypt (cost 12), not Argon2id — bcrypt is not weak, but Argon2id is the
  more current recommendation; documented as a future hardening step, not done.

## Code-level observations

- `middleware/auth.ts`'s central gate (`requireAuth`/`requireRole`) does not itself enforce
  per-resource ownership — that logic is duplicated across individual route handlers (e.g. "is
  this my own request/response/review"). Correct in the cases spot-checked during this audit, but
  each new route re-implements this check by hand rather than through a shared helper — a real
  place for a future ownership bug to slip in unnoticed. No shared `assertOwnership()` helper
  exists.
- `lib/mailer.ts` swallows send failures by design (so a broken SMTP config never breaks a
  request) — correct tradeoff for reliability, but it also means a persistently broken mail
  provider fails **silently** with nothing but a log line. No delivery-failure alerting exists.
- Real-time messaging is polling-based (documented, intentional MVP tradeoff, not a bug).
- No structured application-level analytics/event tracking exists yet (Phase 16 of the
  launch-readiness sprint addresses this).
- `apps/web` has no state-management library and no data-fetching cache layer (`useApi` refetches
  on every mount) — reasonable at current scale, would need revisiting if pages start sharing a
  lot of cross-cutting server state.

## Dependency debt

- `multer@1.4.5-lts.x` (used for file uploads) has known CVEs patched only in the 2.x line;
  apps/api and apps/marketing-agent both still pin 1.x. `npm audit` at the repo root currently
  reports vulnerabilities (moderate/high/critical mix) — run `npm audit` and triage before pilot
  launch; see `docs/SECURITY_REVIEW.md` for the specific findings and recommended action.

## Explicitly NOT debt (intentional, documented tradeoffs — listed so they aren't "rediscovered")

- Dual demo/production mode sharing one codebase — deliberate, not accidental complexity.
- Polling instead of WebSockets for messaging — deliberate MVP simplification.
- No payment processing — deliberate, arrangements happen off-platform (§ product definition).
- In-memory rate limiting — deliberate single-node MVP choice, documented exit path to Redis.
