# Architecture

_Written from direct inspection of this checkout (2026-08-03) — describes what exists, not the
originally intended design._

## Stack

- **API**: Express 4 + TypeScript + Prisma 5, ESM (`"type": "module"`), Node 20+.
- **Web**: React 18 + Vite 5 + TypeScript, React Router v6, plain global CSS (no Tailwind, no
  component library, no CSS modules).
- **Database**: PostgreSQL (single database, 27 models, 5 migrations as of this audit).
- **Sessions**: server-side, stored in PostgreSQL via `connect-pg-simple` (no Redis).
- **Email**: SMTP via `nodemailer`, no proprietary provider.
- **Object storage**: local disk or any S3-compatible endpoint, behind a `Storage` interface.
- **Marketing agent**: a second, fully independent application (`apps/marketing-agent/`) — see
  its own `README.md` and `docs/marketing-agent/ARCHITECTURE.md`. Not part of this document.

## Directory structure (actual)

```
apps/
  api/
    prisma/
      schema.prisma        27 models, 13 enums, single datasource
      migrations/           5 migrations: init, category icon, subject suggestions,
                             login lockout, verifications
      seed.ts / reset.ts / accounts.ts / export.ts   demo data + portability tooling
    src/
      config/env.ts          single zod-validated config, APP_ENV-gated
      lib/                   prisma, logger, errors, mailer, storage, audit, tokens,
                              password, normalize, notify, asyncHandler, validate
      middleware/             auth.ts (loadUser/requireAuth/requireRole/requireVerified),
                               rateLimit.ts, errorHandler.ts
      modules/                15 domain folders: admin, auth, conversations, engagements,
                               files, notifications, reports, requests, responses, reviews,
                               search, subjects, taxonomy, tutors, users
      routes.ts               single aggregator, mounts each module under /api/<module>
      app.ts / index.ts       createApp() factory + entrypoint (DB check, graceful shutdown)
    tests/
      permissions.test.ts     THE ONLY TEST FILE — 21 tests
      helpers.ts / setup.ts   supertest app, resetDb(), fixture helpers, migration bootstrap
  web/
    src/
      pages/                  32 top-level .tsx files (flat, some grouped: admin/, tutor/,
                               requests/, legal/)
      components/              ui.tsx (design-system primitives), AdminNav.tsx, Layout.tsx
      lib/                     api.ts (fetch wrapper), useApi.ts, auth.tsx, toast.tsx,
                               format.ts, types.ts
      styles.css               one global stylesheet, CSS custom properties for theming
  marketing-agent/             separate application — see its own docs
docs/                          this directory
scripts/                       backup.sh/ps1, restore.sh/ps1
docker-compose.yml              app + db + storage(MinIO) + mail(Mailpit)
Dockerfile                      multi-stage: builds web + api, API serves built SPA
render.yaml                     Render blueprint (demo-mode deploy)
```

## Request flow (API)

```
Browser (apps/web, or any client)
   │ fetch('/api/...', { credentials: 'include' })
   ▼
app.ts: helmet → cors(WEB_ORIGIN) → json/urlencoded → pino-http → session(PG-backed)
   → loadUser → apiLimiter → routes.ts
   ▼
routes.ts → modules/<name>/<name>.routes.ts
   │  requireAuth / requireRole(...) / requireVerified middleware
   │  validate({body,query,params}) — zod
   ▼
modules/<name>/<name>.service.ts (business logic) ⟷ prisma ⟷ PostgreSQL
   │
   ├─→ lib/mailer.ts (SMTP, failures swallowed — never break a request)
   ├─→ lib/storage.ts (local disk or S3-compatible)
   └─→ lib/audit.ts (AuditLog row for sensitive actions)
```

Errors flow through a single `errorHandler` middleware (`AppError` subclasses → consistent JSON;
`Prisma.PrismaClientKnownRequestError` P2002/P2025 mapped to 409/404; everything else → 500 with
no internal detail leaked to the client).

## Authorization model

Central, not ad-hoc: `requireAuth` / `requireRole(...roles)` / `requireVerified`
(`middleware/auth.ts`) are the only gate. Ownership checks (e.g. "is this my own request") live
in the domain services/routes themselves, not in the central middleware — worth double-checking
per-route during the security review (Phase 4) rather than assumed correct everywhere.

## Config and environment safety

`src/config/env.ts`: one zod schema, `APP_ENV` (`development|demo|production`) is the *only*
signal used to derive safety flags — never the hostname, never `NODE_ENV`. Production refuses to
boot with demo login enabled, a weak/default `SESSION_SECRET`, or missing S3 credentials when
`STORAGE_DRIVER=s3`. This pattern is deliberately mirrored in `apps/marketing-agent`.

## Data model shape (see `docs/DATA_MODEL.md` for the full review)

27 models. No blanket soft-delete — lifecycle state is modeled per-entity with nullable
`DateTime?` columns (`deletedAt`, `suspendedAt`, `hiddenAt`, `publishedAt`, `closedAt`,
`completedAt`, `cancelledAt`, `resolvedAt`, `verifiedAt`, `archivedAt`, `lockedUntil`). Money is
`*Cents Int`, never a float. All primary keys are `Int @id @default(autoincrement())` — no UUIDs.

## What is NOT present (worth stating plainly for an audit)

- No end-to-end/browser test suite (Playwright/Cypress) — only API-level supertest.
- No CI workflow file was found wiring `npm test`/`typecheck` to run on every push (only
  `.github/workflows/aws.yml`, which is a deploy workflow, not a test gate — verify this in
  Phase 3/22).
- No structured monitoring/alerting/log-aggregation integration.
- No CSRF-token scheme (relies on `SameSite=Lax` + CORS origin restriction).
- No malware scanning on uploaded files (MIME/size validation only).
- No shared rate-limit store — in-memory, fine for one node, not for horizontal scaling.
