# SkillSplore

A sovereign, self-hostable tutoring marketplace connecting students with independent tutors
(built for New Zealand and Australia in the demo, but not locked to any region).

This repository is **one codebase** that runs in two modes — a demonstration mode with rich
fictional data, and a production mode for real users — sharing the same schema, business logic,
authentication, permissions and UI. It depends only on portable, replaceable infrastructure:
standard **PostgreSQL**, **generic SMTP** for email, and **S3-compatible or local** object storage.
No proprietary platform (Supabase, Vercel, Firebase, Clerk, Auth0, a paid search/maps API, or a
payment provider) is required to run it.

> **Status:** working MVP, prepared for production but **not yet production-certified**.
> See [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) and [`docs/SECURITY.md`](docs/SECURITY.md)
> for what remains before accepting real users.

---

## Quick start — Docker (recommended)

Runs the whole stack: the app, PostgreSQL, S3-compatible storage (MinIO) and a local email-capture
inbox (Mailpit). No external accounts needed.

```bash
git clone <repository>
cd skillsplore
cp .env.example .env
docker compose up --build
# in another terminal, once the app is healthy:
docker compose exec app npm run demo:seed
```

Then open **http://localhost:4000**. Supporting UIs:

- Mailpit (captured emails): http://localhost:8025
- MinIO console (object storage): http://localhost:9001 (`skillsplore` / `skillsplore-secret`)

## Quick start — local development (no Docker)

Requires Node 20+ and a running PostgreSQL. Point `DATABASE_URL` in `.env` at your database, then:

```bash
npm install
npm run migrate            # apply database migrations
npm run demo:seed          # load demonstration data
npm run dev                # API on :4000, web dev server on :5173
```

Open **http://localhost:5173** (the Vite dev server proxies the API).

## Demo accounts

Created by the seed process. **These credentials only exist in development/demo databases** —
production disables demo login entirely. List them any time with `npm run demo:accounts`.

| Role          | Email                                | Password         |
| ------------- | ------------------------------------ | ---------------- |
| Administrator | `admin@demo.skillsplore.local`         | `skillsplore-demo` |
| Student       | `student@demo.skillsplore.local`       | `skillsplore-demo` |
| Approved tutor| `tutor@demo.skillsplore.local`         | `skillsplore-demo` |
| Pending tutor | `pending.tutor@demo.skillsplore.local` | `skillsplore-demo` |

The login page also offers one-click demo shortcuts (demo mode only).

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run API + web dev servers together |
| `npm run build` | Build API and web for production |
| `npm run migrate` | Create/apply a migration (development) |
| `npm run migrate:deploy` | Apply migrations (production/CI) |
| `npm run demo:seed` | Load demonstration data |
| `npm run demo:reset -- --yes` | Wipe and rebuild demo data (refuses in production) |
| `npm run demo:accounts` | Print documented demo accounts |
| `npm run export` | Export all data to a portable JSON file |
| `npm test` | Run the API permission/behaviour tests |
| `npm run typecheck` / `npm run lint` | Static checks |

## Architecture

```
skillsplore/
├── apps/
│   ├── api/           Express + TypeScript + Prisma (business logic, auth, REST API)
│   │   ├── prisma/    schema, migrations, seed/reset/accounts/export scripts
│   │   └── src/       config, lib (adapters), middleware, modules/ (one per domain)
│   └── web/           React + Vite + TypeScript SPA
├── docs/              handover, security, deployment, ownership-transfer docs
├── scripts/           backup / restore helpers
├── docker-compose.yml full local stack
└── Dockerfile         production/demo image (API serves the built SPA)
```

- **Operating mode** is set by `APP_ENV` (`development` | `demo` | `production`) — never inferred
  from the hostname. Production refuses to start with insecure demo settings.
- **Email** and **object storage** are accessed through adapter interfaces
  (`src/lib/mailer.ts`, `src/lib/storage.ts`), so infrastructure can be swapped without touching
  business logic.
- **Sessions** persist in PostgreSQL (no Redis or proprietary realtime service).

See [`docs/FEATURES.md`](docs/FEATURES.md) for the full feature list,
[`docs/PRODUCT_COMPARISON.md`](docs/PRODUCT_COMPARISON.md) for how the product and design compare
to the profi.ru reference, and [`docs/OWNERSHIP_TRANSFER.md`](docs/OWNERSHIP_TRANSFER.md) for taking
ownership.
