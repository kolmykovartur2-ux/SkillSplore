# Backup and restore

The marketing agent's data lives entirely in its own PostgreSQL database
(`skillsplore_marketing`) plus, if `OBJECT_STORAGE_PROVIDER=local`, the media library files under
`OBJECT_STORAGE_LOCAL_DIR`. Neither overlaps with the marketplace's own backup set.

## Database dump

```bash
# Docker Compose:
docker compose exec -T db pg_dump --format=custom --no-owner --no-privileges \
  -U skillsplore skillsplore_marketing > backups/marketing-agent-$(date +%F).dump

# Restore into a fresh database:
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d postgresql://skillsplore:skillsplore@localhost:5433/skillsplore_marketing \
  backups/marketing-agent-2026-08-03.dump
```

## Media files

If using local storage, back up `OBJECT_STORAGE_LOCAL_DIR` (or the mounted Docker volume) the
same way you'd back up any file directory. If using S3-compatible storage, rely on the bucket
provider's own backup/versioning features.

## Portable export (no database access required)

The dashboard's export endpoints don't need direct database access — useful for a quick
point-in-time export without touching infrastructure:

- `GET /api/export/all.json` — every draft, campaign, pillar, fact, media asset, consent,
  published post, analytics row, and audit log entry, as one JSON file.
- `GET /api/export/drafts.csv`, `GET /api/export/analytics.csv` — flat CSV exports of the two
  tables most useful for spreadsheet analysis.

Schedule these (or the `pg_dump` above) via cron/systemd timer, and store copies off-host. Test
restores regularly — an untested backup is not a backup.

## What is NOT backed up by any of the above

LinkedIn itself. This service treats its own database as the source of truth for content
history — see `ARCHITECTURE.md` — but the *live* published posts obviously still live on
LinkedIn's platform. If SkillSplore's LinkedIn Page is ever deleted, published-post *records*
survive here, but the posts themselves do not; there's no automated re-publish path.
