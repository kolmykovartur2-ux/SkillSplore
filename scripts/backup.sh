#!/usr/bin/env sh
# Backs up the SkillSplore PostgreSQL database (and local object storage, if any).
# Uses only standard PostgreSQL tooling — portable to any host.
#
#   DATABASE_URL=postgres://... ./scripts/backup.sh
#   # or inside Docker:
#   docker compose exec -T db pg_dump ... (see docs/DEPLOYMENT.md)
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the database you want to back up}"

TS=$(date +%Y%m%d-%H%M%S)
DIR="${BACKUP_DIR:-backups}"
mkdir -p "$DIR"

DB_OUT="$DIR/skillsplore-$TS.dump"
echo "Dumping database -> $DB_OUT"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$DB_OUT"

# Object storage: only relevant for the local filesystem driver.
if [ -d "storage-data" ]; then
  STORE_OUT="$DIR/storage-$TS.tgz"
  echo "Archiving local object storage -> $STORE_OUT"
  tar czf "$STORE_OUT" storage-data
fi

echo "Backup complete: $DB_OUT"
