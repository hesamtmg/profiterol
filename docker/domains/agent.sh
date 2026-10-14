#!/bin/sh
# The domains agent: gives every Profiterol site its address on the shared Oblivion proxy, and its certificate.
#
# Every few seconds it asks the API (/api/internal/sites) for the sites and their addresses, and:
#   - for each site whose owner chose "Issue SSL" (Admin → Sites), runs the certificate steps and reports each one
#     to the site's timeline: DNS check, challenge path, Oblivion's scripts/issue-cert.sh, proxy config, reload,
#     HTTPS check. Nothing is asked of Let's Encrypt unless the owner asked for it.
#   - writes $OBLIVION_DIR/nginx/conf.d/profiterol-sites.conf with a server block for every site: HTTPS with its
#     certificate when it has one, plain HTTP otherwise; other addresses redirect to the main one. Oblivion's
#     nginx is tested and reloaded only when the file changes, and the old file is put back if the test fails.
#   - reports the server's public IP (for the DNS instructions) and the certificates' expiry dates (renewals by
#     Oblivion's certbot then show up in the timelines).
#
#   agent.sh            run forever (the container's command)
#   agent.sh once       one round, then exit
#   agent.sh render     print the config for the sites JSON on stdin (used by CI); CERTS_DIR says which exist,
#                       CERTS_PATH where nginx finds them
#
# Settings (environment): API_URL, INTERNAL_TOKEN, OBLIVION_DIR, OBLIVION_NGINX (container name),
# UPSTREAM (this project's nginx on the oblivion network), INTERVAL (seconds), LETSENCRYPT_STAGING=1,
# SKIP_DNS_CHECK=1 (when a CDN sits in front, so the domain does not point at this server).
set -u

API_URL=${API_URL:-http://profiterol-api:3001/api}
INTERNAL_TOKEN=${INTERNAL_TOKEN:-}
OBLIVION_DIR=${OBLIVION_DIR:-/root/Oblivion}
OBLIVION_NGINX=${OBLIVION_NGINX:-oblivion-nginx}
UPSTREAM=${UPSTREAM:-profiterol-nginx:80}
INTERVAL=${INTERVAL:-20}
CERTS_DIR=${CERTS_DIR:-/etc/letsencrypt/live}
# Where Oblivion's nginx finds them (the same path, unless testing the config elsewhere).
CERTS_PATH=${CERTS_PATH:-$CERTS_DIR}
WEBROOT=${WEBROOT:-/var/www/certbot}
CONF_NAME=profiterol-sites.conf
VERSION=1

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# ---------- API ----------

api() { # api METHOD PATH [JSON]
	if [ -n "${3:-}" ]; then
		curl -fsS -m 20 -X "$1" -H "x-internal-token: $INTERNAL_TOKEN" -H 'content-type: application/json' --data "$3" "$API_URL$2"
	else
		curl -fsS -m 20 -X "$1" -H "x-internal-token: $INTERNAL_TOKEN" "$API_URL$2"
	fi
}

# event SITE_ID STEP STATE MESSAGE: one line in the site's certificate timeline.
event() {
	log "[$2] $3: $4"
	api POST "/internal/sites/$1/events" "$(jq -nc --arg s "$2" --arg t "$3" --arg m "$4" '{step: $s, state: $t, message: ($m | .[0:3900])}')" >/dev/null ||
		log "could not report the event"
}

# finish SITE_ID true|false MESSAGE [EXPIRES]: the job's outcome.
finish() {
	api POST "/internal/sites/$1/ssl" "$(jq -nc --argjson ok "$2" --arg m "$3" --arg e "${4:-}" '{ok: $ok, message: $m} + (if $e == "" then {} else {expires: $e} end)')" >/dev/null ||
		log "could not report the result"
}

# ---------- Facts about this server ----------

SERVER_IP=""
server_ip() {
	[ -n "$SERVER_IP" ] || SERVER_IP=$(curl -fsS -4 -m 5 https://api.ipify.org 2>/dev/null || true)
	printf '%s' "$SERVER_IP"
}

has_cert() { [ -f "$CERTS_DIR/$1/fullchain.pem" ] && [ -f "$CERTS_DIR/$1/privkey.pem" ]; }

# ISO date a certificate expires, e.g. 2027-01-05T12:00:00Z.
cert_expiry() {
	end=$(openssl x509 -enddate -noout -in "$CERTS_DIR/$1/cert.pem" 2>/dev/null | cut -d= -f2) || return 1
	[ -n "$end" ] || return 1
	date -u -d "$(printf '%s' "$end" | sed 's/ GMT$//')" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null ||
		date -u -D '%b %d %H:%M:%S %Y' -d "$(printf '%s' "$end" | sed 's/ GMT$//; s/  */ /g')" +%Y-%m-%dT%H:%M:%SZ
}

# Server names used by other Oblivion configs (hand-written ones, other projects): this agent leaves them alone.
managed_elsewhere() {
	for f in "$OBLIVION_DIR"/nginx/conf.d/*.conf; do
		[ -f "$f" ] || continue
		[ "$(basename "$f")" = "$CONF_NAME" ] && continue
		sed -n 's/^[[:space:]]*server_name[[:space:]]\{1,\}\([^;]*\);.*/\1/p' "$f"
	done | tr ' ' '\n' | grep -vxE '_?' | sort -u
}

# ---------- The proxy configuration ----------

# render: the config for the sites JSON on stdin (the /internal/sites answer). $ELSEWHERE lists names to skip.
render() {
	printf '# Written by profiterol'"'"'s domains agent (docker/domains/agent.sh) from Admin → Sites. Do not edit:\n'
	printf '# changes are overwritten. Sites with a certificate get HTTPS; the others plain HTTP until it is issued.\n'
	jq -c '.[]' | while read -r site; do
		primary=$(printf '%s' "$site" | jq -r .primary)
		if [ -z "$primary" ] || [ "$primary" = null ]; then continue; fi
		if printf '%s\n' "${ELSEWHERE:-}" | grep -qxF "$primary"; then
			printf '\n# %s is configured in another file of nginx/conf.d; left alone.\n' "$primary"
			continue
		fi
		name=$(printf '%s' "$site" | jq -r '.name | gsub("[\\n\\r#]"; " ")')
		aliases=$(printf '%s' "$site" | jq -r '.domains[1:][]' | while read -r d; do
			printf '%s\n' "${ELSEWHERE:-}" | grep -qxF "$d" || printf '%s ' "$d"
		done)
		aliases=${aliases% }
		mode=$(printf '%s' "$site" | jq -r .sslMode)
		printf '\n# %s (%s)\n' "$name" "$(printf '%s' "$site" | jq -r .id)"
		if [ "$mode" = requested ] && has_cert "$primary"; then
			cat <<EOF
server {
    listen 80;
    server_name $primary${aliases:+ $aliases};
    include /etc/nginx/snippets/acme.conf;
    location / {
        return 301 https://$primary\$request_uri;
    }
}
EOF
			if [ -n "$aliases" ]; then
				cat <<EOF
server {
    listen 443 ssl;
    http2 on;
    server_name $aliases;
    ssl_certificate     $CERTS_PATH/$primary/fullchain.pem;
    ssl_certificate_key $CERTS_PATH/$primary/privkey.pem;
    location / {
        return 301 https://$primary\$request_uri;
    }
}
EOF
			fi
			cat <<EOF
server {
    listen 443 ssl;
    http2 on;
    server_name $primary;
    ssl_certificate     $CERTS_PATH/$primary/fullchain.pem;
    ssl_certificate_key $CERTS_PATH/$primary/privkey.pem;
    client_max_body_size 25m;
    set \$profiterol http://$UPSTREAM;
    location / {
        proxy_pass \$profiterol;
        include /etc/nginx/snippets/proxy.conf;
    }
}
EOF
		else
			cat <<EOF
server {
    listen 80;
    server_name $primary;
    include /etc/nginx/snippets/acme.conf;
    client_max_body_size 25m;
    set \$profiterol http://$UPSTREAM;
    location / {
        proxy_pass \$profiterol;
        include /etc/nginx/snippets/proxy.conf;
    }
}
EOF
			if [ -n "$aliases" ]; then
				cat <<EOF
server {
    listen 80;
    server_name $aliases;
    include /etc/nginx/snippets/acme.conf;
    location / {
        return 301 http://$primary\$request_uri;
    }
}
EOF
			fi
		fi
	done
}

nginx_test() { docker exec "$OBLIVION_NGINX" nginx -t 2>&1; }

# Writes the config; tests and reloads Oblivion's nginx when it changed. Prints a message; fails if the test failed.
sync_conf() {
	conf="$OBLIVION_DIR/nginx/conf.d/$CONF_NAME"
	new=$(mktemp)
	printf '%s' "$1" | ELSEWHERE="$(managed_elsewhere)" render >"$new"
	if [ -f "$conf" ] && cmp -s "$new" "$conf"; then
		rm -f "$new"
		echo "unchanged"
		return 0
	fi
	[ -f "$conf" ] && cp "$conf" "$conf.bak"
	cat "$new" >"$conf"
	rm -f "$new"
	if ! out=$(nginx_test); then
		if [ -f "$conf.bak" ]; then mv "$conf.bak" "$conf"; else rm -f "$conf"; fi
		echo "nginx -t failed, previous config kept: $(printf '%s' "$out" | tail -n 5)"
		return 1
	fi
	rm -f "$conf.bak"
	if ! out=$(docker exec "$OBLIVION_NGINX" nginx -s reload 2>&1); then
		echo "reload failed: $out"
		return 1
	fi
	echo "reloaded"
}

# ---------- A certificate job ----------

resolve_a() { dig +short A "$1" 2>/dev/null | grep -E '^[0-9.]+$' | head -n 1; }

issue() { # issue SITE_JSON ALL_SITES_JSON
	id=$(printf '%s' "$1" | jq -r .id)
	primary=$(printf '%s' "$1" | jq -r .primary)
	domains=$(printf '%s' "$1" | jq -r '.domains | join(" ")')
	ip=$(server_ip)

	# 1. DNS: every address must point here, or Let's Encrypt cannot verify it (and failures count against limits).
	event "$id" dns running "Looking up $domains"
	if [ "${SKIP_DNS_CHECK:-}" = 1 ]; then
		event "$id" dns ok "Skipped (SKIP_DNS_CHECK=1)"
	else
		bad=""
		for d in $domains; do
			got=$(resolve_a "$d")
			if [ -z "$got" ]; then
				bad="$bad\n$d has no A record yet."
			elif [ -n "$ip" ] && [ "$got" != "$ip" ]; then
				bad="$bad\n$d points to $got, this server is $ip."
			fi
		done
		if [ -n "$bad" ]; then
			msg=$(printf "Fix the DNS records first (changes can take a while to spread):%b" "$bad")
			event "$id" dns failed "$msg"
			finish "$id" false "$msg"
			return
		fi
		event "$id" dns ok "All addresses point to ${ip:-this server}"
	fi

	# 2. The challenge path answers through Oblivion (it serves /.well-known/acme-challenge/ for any address).
	event "$id" challenge running "Checking that http://$primary/.well-known/acme-challenge/ reaches this server"
	probe="profiterol-check-$(date +%s)"
	mkdir -p "$WEBROOT/.well-known/acme-challenge"
	printf 'ok' >"$WEBROOT/.well-known/acme-challenge/$probe"
	if [ "$(curl -fsS -m 10 "http://$primary/.well-known/acme-challenge/$probe" 2>/dev/null)" = ok ]; then
		event "$id" challenge ok "Reachable from the internet"
	elif [ "$(curl -fsS -m 10 -H "Host: $primary" "http://$OBLIVION_NGINX/.well-known/acme-challenge/$probe" 2>/dev/null)" = ok ]; then
		event "$id" challenge ok "Oblivion answers it (could not check from outside: some servers cannot reach their own public address)"
	else
		rm -f "$WEBROOT/.well-known/acme-challenge/$probe"
		msg="Oblivion's nginx does not answer the challenge path. Is it running, with its 01-default.conf?"
		event "$id" challenge failed "$msg"
		finish "$id" false "$msg"
		return
	fi
	rm -f "$WEBROOT/.well-known/acme-challenge/$probe"

	# 3. The certificate, by Oblivion's own script (keeps an existing one, adds new addresses to it).
	event "$id" certificate running "Asking Let's Encrypt for $domains${LETSENCRYPT_STAGING:+ (staging)}"
	# shellcheck disable=SC2086
	if out=$(cd "$OBLIVION_DIR" && sh scripts/issue-cert.sh ${LETSENCRYPT_STAGING:+--staging} $domains 2>&1); then
		event "$id" certificate ok "$(printf '%s' "$out" | grep -iE 'certificate|success|not yet due' | tail -n 3)"
	else
		msg=$(printf '%s' "$out" | tail -n 12)
		event "$id" certificate failed "$msg"
		finish "$id" false "Let's Encrypt refused: $(printf '%s' "$out" | grep -iE 'detail|error' | tail -n 1)"
		return
	fi

	# 4-5. The proxy config, now with HTTPS for this site.
	event "$id" nginx running "Writing nginx/conf.d/$CONF_NAME"
	if ! res=$(sync_conf "$2"); then
		event "$id" nginx failed "$res"
		finish "$id" false "$res"
		return
	fi
	event "$id" nginx ok "Config written and tested"
	event "$id" reload ok "Oblivion's nginx $res"

	# 6. HTTPS answers with the new certificate.
	event "$id" verify running "Opening https://$primary/"
	if curl -fsS -o /dev/null -m 15 "https://$primary/healthz" 2>/dev/null ||
		curl -fsS -o /dev/null -m 15 --connect-to "$primary:443:$OBLIVION_NGINX:443" "https://$primary/healthz" 2>/dev/null; then
		expires=$(cert_expiry "$primary" || true)
		event "$id" verify ok "https://$primary is secure${expires:+, valid until ${expires%%T*}}"
		finish "$id" true "Secure" "$expires"
	else
		msg="The certificate is installed but https://$primary/ did not answer. It may need a minute; use Retry."
		event "$id" verify failed "$msg"
		finish "$id" false "$msg"
	fi
}

# ---------- Rounds ----------

LAST_HEARTBEAT=0
heartbeat() { # every round for the IP and liveness; certificates once an hour
	now=$(date +%s)
	certs='[]'
	if [ $((now - LAST_HEARTBEAT)) -ge 3600 ]; then
		certs=$(for dir in "$CERTS_DIR"/*/; do
			[ -f "$dir/cert.pem" ] || continue
			n=$(basename "$dir")
			e=$(cert_expiry "$n") && jq -nc --arg n "$n" --arg e "$e" '{name: $n, expires: $e}'
		done | jq -sc '.')
		LAST_HEARTBEAT=$now
	fi
	api POST /internal/heartbeat "$(jq -nc --arg ip "$(server_ip)" --arg v "$VERSION" --argjson c "$certs" \
		--arg e "$(managed_elsewhere | tr '\n' ' ')" \
		'{serverIp: $ip, version: $v, certificates: $c, managedElsewhere: ($e | split(" ") | map(select(. != "")))}')" >/dev/null
}

round() {
	if ! sites=$(api GET /internal/sites); then
		log "the API is not answering at $API_URL (or INTERNAL_TOKEN does not match)"
		return 1
	fi
	heartbeat || log "heartbeat failed"
	res=$(sync_conf "$sites") || log "proxy config: $res"
	[ "$res" = reloaded ] && log "proxy config updated"
	printf '%s' "$sites" | jq -c '.[] | select(.due)' | while read -r site; do
		issue "$site" "$sites"
	done
}

case "${1:-loop}" in
render)
	ELSEWHERE=${ELSEWHERE:-} render
	;;
once)
	round
	;;
loop)
	[ -n "$INTERNAL_TOKEN" ] || {
		log "Set INTERNAL_TOKEN (the same as the API's)."
		exit 1
	}
	[ -d "$OBLIVION_DIR/nginx/conf.d" ] || {
		log "No Oblivion checkout at $OBLIVION_DIR (set OBLIVION_DIR)."
		exit 1
	}
	log "domains agent: $API_URL → $OBLIVION_DIR/nginx/conf.d/$CONF_NAME (upstream $UPSTREAM)"
	trap 'exit 0' TERM INT
	while :; do
		round || true
		sleep "$INTERVAL" &
		wait $!
	done
	;;
*)
	sed -n '2,24p' "$0"
	exit 2
	;;
esac
