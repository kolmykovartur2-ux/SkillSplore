# Deployment

Learnfolk deploys as Docker containers to any privately controlled server. It needs only
PostgreSQL, persistent file storage (or an S3-compatible bucket), generic SMTP and HTTPS.

## Hosted demonstration (password-protected)

1. Provision a server you control (any cloud VM or on-prem host) with Docker + Docker Compose.
2. Clone the repository and create an `.env` from `.env.example`.
3. Set `APP_ENV=demo`, `SHOW_DEMO_BANNER=1`, and a strong `SESSION_SECRET`.
4. Put the app behind a reverse proxy (Caddy, nginx, Traefik) terminating **HTTPS**, and add
   HTTP Basic Auth or an allow-list at the proxy so only invited people can reach it.
5. `docker compose up -d --build` then `docker compose exec app npm run demo:seed`.
6. For external demos, do **not** expose the shared demo credentials publicly — create short-lived
   demo users or share controlled credentials privately.

The demo banner ("Demonstration environment — data may be reset.") is controlled by
`SHOW_DEMO_BANNER` and is forced off when `APP_ENV=production`.

## Production

1. `APP_ENV=production`. The app will refuse to start if demo login is enabled, the session secret
   is weak/default, or S3 credentials are missing when `STORAGE_DRIVER=s3`.
2. Use managed or self-hosted **PostgreSQL** with automated backups (see below).
3. Use **persistent object storage** — a mounted volume for the local driver, or any S3-compatible
   bucket (`STORAGE_DRIVER=s3`).
4. Configure a real **SMTP** provider and verify the sending domain (SPF/DKIM/DMARC).
5. Terminate **HTTPS** at a reverse proxy and forward to the app on port 4000. Keep
   `X-Forwarded-*` headers (the app sets `trust proxy` in production).
6. Apply migrations on deploy: `npm run migrate:deploy` (the compose `app` service already does this
   on start).
7. Set a unique `SESSION_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

### Reverse proxy example (Caddy)

```
learnfolk.example.com {
    reverse_proxy app:4000
}
```

## Building the image

```bash
docker build -t learnfolk:latest .
```

The multi-stage `Dockerfile` builds the web client and the API, then ships a lean runtime in which
the API serves the built SPA as static files (single origin).

## Backups

See [`DATA_EXPORT.md`](DATA_EXPORT.md). In Docker:

```bash
# Database dump
docker compose exec -T db pg_dump --format=custom --no-owner --no-privileges \
  -U learnfolk learnfolk > backups/learnfolk-$(date +%F).dump

# Object storage: back up the MinIO/volume data or your S3 bucket.
```

Schedule these (cron/systemd timer) and store copies off-host. Test restores regularly.

## Health checks

`GET /api/health` returns `200` with `{ "status": "ok" }` when the database is reachable, `503`
otherwise. Point your orchestrator/uptime monitor at it.
