# Environments

SkillSplore runs in exactly one of three modes, set by a single environment variable —
`APP_ENV` — and never inferred from the hostname, `NODE_ENV`, or anything else. This is the one
switch that controls every piece of demo/production separation described below.

```
APP_ENV = development | demo | production
```

## The three modes

| | `development` | `demo` | `production` |
|---|---|---|---|
| Purpose | Local coding | Public-facing showcase with fictional data | Real users, real data |
| Demo login shortcuts | Allowed | Allowed | **Hard-disabled**, server-side |
| "Demonstration environment" banner | Off by default (can enable) | On by default | **Forced off** |
| `npm run demo:seed` / `demo:reset` / `demo:accounts` | Allowed | Allowed | **Refuses to run** |
| Boot-time secret strength checks | Not enforced | Not enforced | **Enforced** — refuses to start on failure |
| Cookies | Not forced secure (can override) | Not forced secure | Forced `Secure` |

## Where this is enforced

Everything below reads `APP_ENV` and nothing else — there is no separate "is this a demo box"
heuristic anywhere in the codebase.

- **`apps/api/src/config/env.ts`** — the single source of truth. Derives `isProduction`,
  `demoLoginEnabled`, `showDemoBanner`, `secureCookies` from `APP_ENV` (never from the raw env
  vars directly — e.g. `demoLoginEnabled = ENABLE_DEMO_LOGIN && !isProduction`, so setting
  `ENABLE_DEMO_LOGIN=1` in production doesn't actually enable it). If `APP_ENV=production` and any
  of the following are true, the process **refuses to start** (`process.exit(1)`, no partial
  boot): demo login is enabled, the session secret is missing/weak/a known placeholder, or S3
  storage is selected without credentials. Covered by
  `apps/api/tests/envProductionGuard.test.ts` (spawns the real module as a subprocess with
  controlled env vars, since these checks call `process.exit` at module load and can't be
  exercised in-process).
- **`apps/api/src/modules/auth/auth.routes.ts`** — `POST /api/auth/demo-login` independently
  checks `env.demoLoginEnabled` server-side before doing anything, regardless of whether the
  frontend shows the demo-login buttons. The frontend hiding the buttons is a UX nicety, not the
  actual security boundary.
  `apps/web/src/pages/Login.tsx` gates rendering the shortcut buttons on
  `config?.demoLoginEnabled`, a value the **server** computes and returns from `GET /api/config`
  — the client never decides this for itself.
- **`apps/api/prisma/_demo.ts`** — `guardDemoCommand()` is called at the top of `seed.ts`,
  `reset.ts`, and `accounts.ts`, before any database code runs. Refuses (`process.exit(1)`) when
  `APP_ENV=production`. Covered by the same `envProductionGuard.test.ts`.
- **`apps/api/prisma/bootstrap.mjs`** (the Docker/Render entrypoint) — only runs the demo seed at
  all when `APP_ENV !== 'production'`, and even then only when the `User` table is empty (so a
  cold-start restart on a sleeping free-tier host never wipes real activity).
- **`apps/web/src/components/Layout.tsx`** — the demo banner renders only when the server-supplied
  `config.showDemoBanner` is true.

## What "demo" data actually is

Demo accounts always use the `@demo.skillsplore.local` email convention (`DEMO_ACCOUNTS` in
`apps/api/prisma/_demo.ts`) and a documented, non-secret password (`DEMO_PASSWORD`, default
`skillsplore-demo`, overridable). There is currently no `isDemo` flag on any database row — demo
data is only distinguishable by that email convention. This is an accepted limitation
(`docs/USER_JOURNEY_AUDIT.md`, "Distinguish demo data from production data"): the *ingestion*
guard (production refuses to seed) is solid; there is no *retroactive* way for an admin to tell
demo-origin rows apart from real ones inside a given database, which only matters if demo and
production ever shared a database — they don't (see below).

## Deployment configurations already using this correctly

- `docker-compose.yml` (root) — sets `APP_ENV: demo` explicitly for the local full-stack demo.
- `render.yaml` — same, `APP_ENV: demo`, with a comment explaining the free-tier constraint that
  led to `bootstrap.mjs` handling migrations+seed inline.
- A real production deployment sets `APP_ENV: production` and supplies its own `SESSION_SECRET`
  (see `docs/DEPLOYMENT.md`) — the boot guard makes it structurally impossible to accidentally
  ship a production instance with demo settings still on.

## The marketing agent is a separate case entirely

`apps/marketing-agent` has its own, simpler three-mode `APP_ENV` and its own analogous guard
(`MOCK_LINKEDIN_API` must be `false` in production) — see
`docs/marketing-agent/ARCHITECTURE.md` and `docs/marketing-agent/KNOWN_LIMITATIONS.md`. It is a
fully independent service with its own database; nothing here about the marketplace's demo/
production separation applies to it, and nothing about its own mock/real LinkedIn separation
applies to the marketplace.
