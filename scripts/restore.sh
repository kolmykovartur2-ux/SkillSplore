#!/usr/bin/env sh
# Restores a Learnfolk database dump created by backup.sh into the database in
# DATABASE_URL. The target database must already exist.
#
#   DATABASE_URL=postgres://... ./scripts/restore.sh backups/learnfolk-YYYYMMDD-HHMMSS.dump
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the target database}"

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: $0 <dump-file>"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "Dump file not found: $FILE"
  exit 1
fi

echo "Restoring $FILE into the target database..."
# --clean --if-exists drops existing objects first so a restore is repeatable.
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$FILE"
echo "Restore complete."
