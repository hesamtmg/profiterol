#!/usr/bin/env bash
# Builds the Mazaheri Trading customs-clearance content on the running site (see scripts/seed-mazaheri.mjs).
#   ./scripts/seed-mazaheri.sh           a separate page: /fa/ترخیص-کالا and /en/customs-clearance
#   ./scripts/seed-mazaheri.sh --home    on the home page, with the site name, menu and colors
# Takes a backup first. Uses the admin login from .env; set ADMIN_EMAIL / ADMIN_PASSWORD to override it.
set -euo pipefail
cd "$(dirname "$0")/.."

# Same compose files as deploy.sh: COMPOSE_FILE in .env (behind Oblivion), else the standalone production stack.
if grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
  compose=(docker compose)
else
  compose=(docker compose -f docker-compose.prod.yml)
fi

overrides=()
[[ -n "${ADMIN_EMAIL:-}" ]] && overrides+=(-e "ADMIN_EMAIL=$ADMIN_EMAIL")
[[ -n "${ADMIN_PASSWORD:-}" ]] && overrides+=(-e "ADMIN_PASSWORD=$ADMIN_PASSWORD")

echo "### Backing up first"
"${compose[@]}" run --rm backup backup

echo "### Building the content"
# The API image has Node, sharp and the admin login; the script comes from this checkout.
"${compose[@]}" run --rm --no-deps \
  -v "$PWD/scripts:/seed:ro" \
  -e API_URL=http://api:3001/api \
  "${overrides[@]}" \
  api node /seed/seed-mazaheri.mjs "$@"
