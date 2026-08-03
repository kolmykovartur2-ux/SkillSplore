# Deployment

The marketing agent deploys as Docker containers to any privately controlled server —
independently of the marketplace. It needs only PostgreSQL and, for real LinkedIn publishing, a
publicly reachable HTTPS URL for the OAuth redirect.

## Hosted demonstration

1. Provision a server (any cloud VM or on-prem host) with Docker + Docker Compose.
2. `cd apps/marketing-agent`, `cp .env.example .env`.
3. `APP_ENV=demo`, `MOCK_LINKEDIN_API=true` (default) — publishing stays simulated.
4. Put it behind a reverse proxy terminating HTTPS, with HTTP Basic Auth or an IP allow-list —
   this is an internal tool, never meant to be publicly reachable without a gate in front of it.
5. `docker compose up -d --build`, then `docker compose exec app npm run demo:seed`.

## Real LinkedIn publishing

1. Complete `LINKEDIN_SETUP.md` and `LINKEDIN_APP_REVIEW.md` first — you need an approved
   LinkedIn developer app before any of this works.
2. Deploy this service at a stable HTTPS URL (e.g. `https://marketing.skillsplore.com`).
3. Register the exact redirect URI `{APP_URL}/api/linkedin/oauth/callback` in the LinkedIn
   developer app — the path is fixed by `src/modules/linkedinConnection/linkedinConnection.routes.ts`,
   don't invent a different one.
4. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`,
   `LINKEDIN_ORGANIZATION_URN`, `LINKEDIN_PUBLISHING_ENABLED=true`, `MOCK_LINKEDIN_API=false` in
   the deployed environment's own secret store — never in a committed file.
5. Restart, log in as the founder, click "Connect LinkedIn" on the LinkedIn page, approve on
   LinkedIn's real consent screen.
6. **Test with a low-stakes draft first** — the real-API code path is implemented but not
   verified end-to-end in the environment that produced it (`KNOWN_LIMITATIONS.md`).

## Production checklist

1. `APP_ENV=production`. The service refuses to start if `MOCK_LINKEDIN_API=true`, if
   `SESSION_SECRET`/`TOKEN_ENCRYPTION_KEY` are weak or default, or if
   `LINKEDIN_PUBLISHING_ENABLED=true` without real credentials.
2. Use managed or self-hosted PostgreSQL with automated backups (see `BACKUP_AND_RESTORE.md`).
3. Run the worker as its own long-lived process/container — `docker-compose.yml`'s `worker`
   service, or an equivalent in your orchestrator. Don't rely on a developer's laptop cron.
4. Terminate HTTPS at a reverse proxy; the app sets `trust proxy` when `secureCookies` is on.
5. Generate unique secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   (run twice — once for `SESSION_SECRET`, once for `TOKEN_ENCRYPTION_KEY`, with different
   output each time).
6. Apply migrations on deploy — the compose `app` service already runs `prisma migrate deploy`
   on start; do the same in any other orchestrator.

## Building the image

```bash
cd apps/marketing-agent
docker build -t skillsplore-marketing-agent:latest .
```

Multi-stage: builds `web/` and the API, ships a lean runtime that serves the built SPA from the
API process (single origin, single container for the `app` service; the `worker` service reuses
the same image with a different `command`).

## Health checks

`GET /api/health` — `200 {"status":"ok"}` when the database is reachable, `503` otherwise. Same
contract as the marketplace's own `/api/health`, but a genuinely separate check — nothing
aggregates the two services' health into one signal.
