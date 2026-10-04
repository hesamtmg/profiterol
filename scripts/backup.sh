#!/bin/sh
# Backs up the database (pg_dump custom format) and the uploads folder, then deletes old backups.
# Runs nightly in the `backup` container; can also be run by hand:
#   docker compose -f docker-compose.prod.yml run --rm backup backup
# Connection: DATABASE_URL, or the standard PGHOST/PGUSER/PGPASSWORD/PGDATABASE variables.
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
UPLOAD_DIR=${UPLOAD_DIR:-/data/uploads}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-14}
stamp=$(date -u +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

db_file="$BACKUP_DIR/db-$stamp.dump"
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --file="$db_file.partial"
else
  pg_dump --format=custom --no-owner --file="$db_file.partial"
fi
# Only complete files get the final name, so a failed run never looks like a good backup.
mv "$db_file.partial" "$db_file"
echo "$(date -u +%FT%TZ) database  -> $db_file ($(du -h "$db_file" | cut -f1))"

if [ -d "$UPLOAD_DIR" ]; then
  up_file="$BACKUP_DIR/uploads-$stamp.tar.gz"
  tar -czf "$up_file.partial" -C "$UPLOAD_DIR" .
  mv "$up_file.partial" "$up_file"
  echo "$(date -u +%FT%TZ) uploads   -> $up_file ($(du -h "$up_file" | cut -f1))"
fi

find "$BACKUP_DIR" -maxdepth 1 \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete |
  sed 's/^/removed old backup: /'
find "$BACKUP_DIR" -maxdepth 1 -name '*.partial' -mmin +60 -delete
