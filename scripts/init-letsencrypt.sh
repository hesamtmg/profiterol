#!/usr/bin/env bash
# First-time HTTPS setup. nginx needs a certificate to start, and Let's Encrypt needs nginx running
# to verify the domain, so this starts nginx with a temporary certificate, requests the real one,
# and reloads nginx.
#
#   ./scripts/init-letsencrypt.sh              real certificate (DNS must already point here)
#   STAGING=1 ./scripts/init-letsencrypt.sh    Let's Encrypt test certificate (no rate limits; browsers warn)
#   ./scripts/init-letsencrypt.sh --self-signed    self-signed only, e.g. to try the stack without a domain
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Create .env first (cp .env.production.example .env)." >&2; exit 1; }
# Read only the values this script needs (sourcing .env would choke on values like "30 2 * * *").
env_get() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}
DOMAIN=$(env_get DOMAIN)
EXTRA_DOMAINS=$(env_get EXTRA_DOMAINS)
LETSENCRYPT_EMAIL=$(env_get LETSENCRYPT_EMAIL)
: "${DOMAIN:?Set DOMAIN in .env}"

compose=(docker compose -f docker-compose.prod.yml)
self_signed=""
[[ "${1:-}" == "--self-signed" ]] && self_signed=1
live="docker/certbot/conf/live/$DOMAIN"

if [[ -f "$live/fullchain.pem" && -z "$self_signed" && "${FORCE:-}" != "1" ]] && ! grep -q "temporary" "$live/.source" 2>/dev/null; then
  echo "A certificate for $DOMAIN already exists. Run with FORCE=1 to request a new one."
  exit 0
fi

mkdir -p "$live" docker/certbot/www
# A self-signed certificate is kept for a year; the temporary one only bridges to Let's Encrypt.
days=1
[[ -n "$self_signed" ]] && days=365
echo "### Creating a temporary certificate for $DOMAIN"
"${compose[@]}" run --rm --no-deps --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days $days \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj /CN=$DOMAIN" certbot
echo temporary > "$live/.source"

echo "### Starting the stack"
"${compose[@]}" up -d --wait nginx

if [[ -n "$self_signed" ]]; then
  echo "### Done: https://$DOMAIN is served with a self-signed certificate (browsers will warn)."
  exit 0
fi

: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL in .env}"
domain_args=(-d "$DOMAIN")
for extra in ${EXTRA_DOMAINS:-}; do domain_args+=(-d "$extra"); done

echo "### Requesting a Let's Encrypt certificate for: $DOMAIN ${EXTRA_DOMAINS:-}"
"${compose[@]}" run --rm --no-deps --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
"${compose[@]}" run --rm --no-deps --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot ${STAGING:+--staging} \
    ${domain_args[*]} --email $LETSENCRYPT_EMAIL --rsa-key-size 4096 \
    --agree-tos --no-eff-email --non-interactive" certbot

echo "### Reloading nginx"
"${compose[@]}" exec nginx nginx -s reload
"${compose[@]}" up -d certbot
echo "### Done: https://$DOMAIN"
