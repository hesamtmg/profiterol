#!/usr/bin/env bash
# Updates the running site: backup, fetch new images (or build them), restart, wait until healthy.
#   ./scripts/deploy.sh             pull images for $TAG (default: latest) from the registry
#   ./scripts/deploy.sh --build     build the images on this server instead
#   ./scripts/deploy.sh --no-pull   use images already on this server (e.g. copied with docker save / docker load)
#   TAG=<commit sha> ./scripts/deploy.sh    deploy (or roll back to) a specific version
# Add --no-backup to skip the safety backup.
set -euo pipefail
cd "$(dirname "$0")/.."

# COMPOSE_FILE in .env (e.g. docker-compose.prod.yml:docker-compose.oblivion.yml behind the shared
# Oblivion proxy) picks the files; without it, the standalone production stack.
if grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
  compose=(docker compose)
else
  compose=(docker compose -f docker-compose.prod.yml)
fi
build="" backup=1 pull=1
for arg in "$@"; do
  case "$arg" in
    --build) build=1 ;;
    --no-backup) backup="" ;;
    --no-pull) pull="" ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ -n "$backup" ]] && "${compose[@]}" ps --status running --services 2>/dev/null | grep -qx db; then
  echo "### Backing up before the update"
  "${compose[@]}" run --rm backup backup
fi

if [[ -n "$build" ]]; then
  echo "### Building images"
  "${compose[@]}" build api web backup
else
  if [[ -n "$pull" ]]; then
    echo "### Pulling images (tag: ${TAG:-latest})"
    "${compose[@]}" pull api web
    # Small image built from this repo's scripts; rebuilt so script changes take effect.
    "${compose[@]}" build backup
  fi
fi

echo "### Restarting (database migrations run when the API starts)"
"${compose[@]}" up -d --remove-orphans --wait
docker image prune -f >/dev/null
"${compose[@]}" ps
