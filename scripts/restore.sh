#!/bin/sh
# Restores a backup made by backup.sh. Replaces the current database (and uploads, if given).
#   restore.sh /backups/db-20261004-023000.dump [/backups/uploads-20261004-023000.tar.gz] [--yes]
# In production, stop the API first so nothing writes during the restore:
#   docker compose -f docker-compose.prod.yml stop api
#   docker compose -f docker-compose.prod.yml run --rm backup restore /backups/db-….dump /backups/uploads-….tar.gz
#   docker compose -f docker-compose.prod.yml start api
set -eu

db_file=""
up_file=""
yes=""
for arg in "$@"; do
  case "$arg" in
    --yes) yes=1 ;;
    *.dump) db_file="$arg" ;;
    *.tar.gz) up_file="$arg" ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [ -z "$db_file" ] || [ ! -f "$db_file" ]; then
  echo "Usage: restore.sh <db-….dump> [uploads-….tar.gz] [--yes]" >&2
  echo "Available backups:" >&2
  # shellcheck disable=SC2012 # backup names are ours and contain no odd characters
  ls -1t "${BACKUP_DIR:-/backups}" 2>/dev/null | head -20 >&2 || true
  exit 2
fi
if [ -n "$up_file" ] && [ ! -f "$up_file" ]; then
  echo "Uploads archive not found: $up_file" >&2
  exit 2
fi

if [ -z "$yes" ]; then
  printf 'This replaces the current database%s with %s.\nType "restore" to continue: ' "${up_file:+ and uploads}" "$db_file"
  read -r answer
  [ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }
fi

if [ -n "${DATABASE_URL:-}" ]; then
  pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --single-transaction "$db_file"
else
  pg_restore --dbname="${PGDATABASE:-postgres}" --clean --if-exists --no-owner --single-transaction "$db_file"
fi
echo "Database restored from $db_file"

if [ -n "$up_file" ]; then
  UPLOAD_DIR=${UPLOAD_DIR:-/data/uploads}
  mkdir -p "$UPLOAD_DIR"
  find "$UPLOAD_DIR" -mindepth 1 -delete
  tar -xzf "$up_file" -C "$UPLOAD_DIR"
  echo "Uploads restored from $up_file"
fi
