# SkillSplore Marketing Agent

An optional, self-hostable LinkedIn content-generation and publishing service for the
SkillSplore company page. It is a **separate deployable service** — its own API, its own
worker, its own React dashboard, its own PostgreSQL database, its own founder login. The
SkillSplore marketplace (`apps/api`, `apps/web`) does not import from it, call it, or depend
on it in any way. Stopping it, deleting it, or leaving LinkedIn disconnected never affects the
marketplace.

> **Status:** working through Phase 5 of `docs/marketing-agent/ROADMAP.md` — draft-only and
> demo (mock-LinkedIn) modes are fully functional and tested. Real LinkedIn OAuth and Posts API
> publishing (Phase 6) are implemented but **not yet verified against the live LinkedIn API** —
> see `docs/marketing-agent/KNOWN_LIMITATIONS.md`.

## Quick start — Docker (recommended)

```bash
cd apps/marketing-agent
cp .env.example .env
docker compose up --build
docker compose exec app npm run demo:seed
```

Open **http://localhost:4100**. The seed creates a founder account (printed to the console if
`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` aren't set), the six content pillars, the
four initial campaigns, a handful of approved marketing facts, and the twelve-post launch
calendar — all in `awaiting_review`, nothing auto-approved or auto-scheduled.

## Quick start — local development (no Docker)

Requires Node 20+ and a running PostgreSQL (a database named `skillsplore_marketing` — separate
from the marketplace's own database).

```bash
cd apps/marketing-agent
npm install
cp .env.example .env        # edit DATABASE_URL etc.
npx prisma migrate dev
npm run demo:seed
npm run dev                 # API on :4100
npm run dev:worker          # scheduler worker, separate process
cd web && npm install && npm run dev   # dashboard on :5183
```

## What this is not

- Not a runtime dependency of the marketplace. `apps/api`/`apps/web` never call this service.
- Not browser automation. No Playwright/Selenium/stored cookies/passwords anywhere in this
  codebase — only LinkedIn's official OAuth 2.0 flow and REST APIs.
- Not autonomous. Every post goes through generate → review → edit → approve → schedule →
  publish. `AUTO_PUBLISH_APPROVED_POSTS` only ever affects already-*approved* content.
- Not a second AI vendor lock-in. `CONTENT_AI_PROVIDER` swaps between Anthropic, an
  OpenAI-compatible endpoint, Ollama, or a deterministic `template` mode that needs no AI
  provider and no network access at all.

## Architecture at a glance

```
apps/marketing-agent/
├── prisma/          schema (own database), migrations, demo seed
├── src/
│   ├── config/env.ts         zod-validated config; production refuses insecure/mock settings
│   ├── lib/                  crypto, audit, timezone, UTM, content validation,
│   │                         ContentGenerationProvider adapters, LinkedIn client(s)
│   ├── modules/               one folder per domain (drafts, schedule, facts, consents, …)
│   ├── app.ts / index.ts      API server
│   └── worker.ts              scheduler worker (separate process/container)
├── web/               React + Vite dashboard, its own login, talks only to this API
├── Dockerfile          own image, independent of the root Dockerfile
└── docker-compose.yml  own stack (db + app + worker), independent of the root compose file
```

See `docs/marketing-agent/ARCHITECTURE.md` for the full design, `docs/marketing-agent/CURRENT_STATE.md`
for exactly what works today, and `docs/marketing-agent/LINKEDIN_SETUP.md` before connecting a
real LinkedIn company page.
