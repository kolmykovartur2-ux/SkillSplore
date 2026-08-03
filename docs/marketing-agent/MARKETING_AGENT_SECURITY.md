# Security

## Implemented

- **Founder auth**: bcrypt (cost 12) password hashing, PostgreSQL-backed sessions
  (`connect-pg-simple`, table `admin_sessions`), session regenerated on login, per-account
  lockout (`LOGIN_LOCKOUT_THRESHOLD`/`LOGIN_LOCKOUT_MINUTES`), generic "incorrect email or
  password" response regardless of whether the account exists, is locked, or the password was
  wrong.
- **LinkedIn token encryption at rest**: AES-256-GCM (`src/lib/crypto.ts`), key derived from
  `TOKEN_ENCRYPTION_KEY` via SHA-256. Tokens are decrypted only in-memory, per-request, inside
  `src/lib/linkedin/realClient.ts` — never logged (see the redaction list in `src/lib/logger.ts`,
  which strips `accessToken`, `refreshToken`, `encryptedAccessToken`, `encryptedRefreshToken`,
  `password`, `passwordHash`, and the session cookie/authorization header from every log line).
- **No tokens sent to AI providers**: `ContentGenerationProvider` implementations only ever
  receive brief/fact/launch-context data — never anything from `LinkedinConnection`.
- **No private SkillSplore user data sent to AI by default**: this service has no access to the
  marketplace's database at all (separate DB, separate service) — there is nothing to leak
  because there's no connection to leak it *through*.
- **Central authorization**: a single `requireAuth` middleware (`src/middleware/auth.ts`) gates
  every route in `src/routes.ts` except `/config`, `/health`, and `/auth/login`.
- **Input validation**: zod on every write endpoint (`src/lib/validate.ts`).
- **Rate limiting**: general (`apiLimiter`) and stricter auth (`authLimiter`) limiters
  (`src/middleware/rateLimit.ts`), skipped only in local development.
- **CSRF posture**: same as `apps/api` — `SameSite=Lax` cookies + CORS restricted to
  `DASHBOARD_ORIGIN` with `credentials: true`. No separate CSRF-token scheme (documented gap,
  matches the marketplace's own stated posture in its `docs/SECURITY.md`).
- **HTTP hardening**: Helmet, CSP enabled in production, disabled in dev/demo for iteration speed.
- **OAuth state + PKCE**: `src/lib/linkedin/oauth.ts` generates a random `state` and a PKCE
  `code_verifier`/`code_challenge` pair per connection attempt, stored server-side in the
  session and validated on callback — mitigates CSRF and authorization-code interception.
- **Environment validation**: `src/config/env.ts` refuses to boot in production with a weak
  `SESSION_SECRET`/`TOKEN_ENCRYPTION_KEY`, `MOCK_LINKEDIN_API=true`, or
  `LINKEDIN_PUBLISHING_ENABLED=true` without real client credentials.
- **Audit logging**: append-only `AuditLog` table, `actorId` has no FK so the trail survives
  account deletion.
- **Upload validation**: MIME-type allowlist + 10MB size limit for media uploads
  (`modules/media/media.routes.ts`).
- **One-click disconnect**: wipes stored tokens, revokes local connection state, preserves
  historical `PublishedPost` records — see `LINKEDIN_COMPLIANCE.md`.

## Outstanding before treating this as production-hardened

- [ ] Independent security review / penetration test.
- [ ] Live verification of the real LinkedIn OAuth/Posts API integration (untested in the build
      environment — see `KNOWN_LIMITATIONS.md`). Token refresh, org-ACL verification, and error
      classification should all be exercised against the real API before relying on them.
- [ ] Formal CSRF-token scheme if this service is ever exposed beyond a single trusted founder.
- [ ] Multi-factor authentication for the founder account, if more than one admin is added later.
- [ ] Centralised log aggregation / alerting in production.
- [ ] Dependency vulnerability review (`npm audit`) before each release — run it now and address
      findings before any production deployment.

## Reporting

Report issues privately to the platform owner until a dedicated security contact is published.
