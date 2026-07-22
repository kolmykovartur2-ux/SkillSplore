# Data export, backup & restore

Learnfolk stores all data in standard PostgreSQL plus object storage (avatars and private
qualification documents). Everything can be exported, backed up and restored with portable tooling.

## 1. Portable JSON export

A provider-independent snapshot of every table:

```bash
npm run export
# writes exports/learnfolk-export-<timestamp>.json
```

Useful for migrations, inspection, or handing data to another system. (Binary files themselves live
in object storage — back those up separately, below.)

## 2. Database backup / restore (pg_dump)

### Local / any host

```bash
# Backup
DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/backup.sh

# Restore into an (existing) target database
DATABASE_URL=postgres://user:pass@host:5432/target ./scripts/restore.sh backups/learnfolk-<ts>.dump
```

On Windows, equivalent helpers are provided:

```powershell
$env:DATABASE_URL = "postgres://user:pass@localhost:5432/db"
./scripts/backup.ps1
./scripts/restore.ps1 backups/learnfolk-<ts>.dump
```

### Docker

```bash
# Backup
docker compose exec -T db pg_dump --format=custom --no-owner --no-privileges \
  -U learnfolk learnfolk > backups/learnfolk-$(date +%F).dump

# Restore into a fresh database
docker compose exec -T db pg_restore --clean --if-exists --no-owner --no-privileges \
  -U learnfolk -d learnfolk < backups/learnfolk-<ts>.dump
```

## 3. Object storage

- **Local driver** (`STORAGE_DRIVER=local`): back up the `storage-data/` directory (the backup
  scripts archive it automatically). In Docker this is the MinIO volume.
- **S3 driver** (`STORAGE_DRIVER=s3`): use your provider's bucket backup/replication, or
  `mc mirror` / `aws s3 sync` to copy the bucket.

## 4. Restore-into-a-fresh-environment drill (acceptance test)

1. Create a clean database and start a fresh app instance pointing at it.
2. Restore the latest dump (section 2) and object storage (section 3).
3. Log in and confirm that users, tutor profiles, requests, messages and reviews are all present.

This exercises the full backup → restore path required by the demonstration acceptance test.
