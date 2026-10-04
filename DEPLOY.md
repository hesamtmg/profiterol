# Deploying Profiterol

This runs the site on one Linux server with Docker:

```
visitors ──HTTPS──▶ nginx ──▶ web (Nuxt)  ──▶ api (NestJS) ──▶ db (Postgres)
                      │                         │
                      └── /uploads ◀────────────┘ shared volume
certbot   renews the Let's Encrypt certificate
backup    nightly database + uploads backup into ./backups
```

Everything is in `docker-compose.prod.yml`. The API runs database migrations every time it starts.

## 1. What you need

- A server running Ubuntu 22.04 or 24.04 (other Linux works too) with **2 GB RAM** or more, and ports **80** and **443** open.
- A domain whose DNS **A record** (and **AAAA** for IPv6) points at the server. Add `www` too if you want it.
- Docker Engine with the Compose plugin:
  ```sh
  curl -fsSL https://get.docker.com | sh
  ```

## 2. Get the files onto the server

```sh
sudo mkdir -p /opt/profiterol && sudo chown $USER /opt/profiterol
git clone https://github.com/hesamtmg/profiterol.git /opt/profiterol
cd /opt/profiterol
```

If the repository is private, add a read-only [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) to it and clone with the `git@github.com:` address.

## 3. Settings

```sh
cp .env.production.example .env
nano .env
```

Fill in `DOMAIN`, `LETSENCRYPT_EMAIL`, and replace every `change-me`:

```sh
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # JWT_SECRET
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` create the first admin account on the very first start. Choose a strong password: changing it from the admin panel is not built yet (see CHECKLIST.md, Phase 1).

Keep `.env` private (`chmod 600 .env`). It is listed in `.gitignore`.

> **Postgres reads `POSTGRES_PASSWORD` only when the database is first created.** If you change it later in `.env`, also change it inside the database (`docker compose -f docker-compose.prod.yml exec db psql -U profiterol -c "ALTER USER profiterol PASSWORD '…'"`), or the API can no longer connect.

## 4. Images

GitHub Actions builds the images on every push to `main` (`.github/workflows/deploy.yml`) and publishes them to GitHub Container Registry as `ghcr.io/hesamtmg/profiterol-api` and `…-web`, tagged `latest` and with the commit SHA.

If the packages are private, log the server in once with a GitHub token that has the `read:packages` scope:

```sh
echo <token> | docker login ghcr.io -u <github-username> --password-stdin
```

**Or build on the server** instead of pulling (needs about 3 GB of free disk and a few minutes): use `./scripts/deploy.sh --build` below.

## 5. First start with HTTPS

```sh
./scripts/init-letsencrypt.sh
```

This starts nginx with a temporary certificate, asks Let's Encrypt for a real one (for `DOMAIN` and `EXTRA_DOMAINS`), and reloads nginx. Then open `https://your-domain` and `https://your-domain/admin`.

- Try the process first without using up Let's Encrypt's rate limits: `STAGING=1 ./scripts/init-letsencrypt.sh` (browsers will warn), then run it again with `FORCE=1`.
- No domain yet? `./scripts/init-letsencrypt.sh --self-signed` serves the site over HTTPS with a self-signed certificate.

Certificates renew automatically: the `certbot` container checks twice a day, and nginx reloads every 6 hours.

## 6. Updating

**Automatically:** add these secrets in GitHub (*Settings → Secrets and variables → Actions*), and every push to `main` deploys:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server address |
| `DEPLOY_USER` | SSH user that can run Docker |
| `DEPLOY_SSH_KEY` | private key for that user (add the public key to `~/.ssh/authorized_keys` on the server) |
| `DEPLOY_PORT` | optional, default 22 |
| `DEPLOY_PATH` | optional, default `/opt/profiterol` |

The deploy job runs in a GitHub environment called `production`. In *Settings → Environments* you can require an approval before each deploy.

**By hand** on the server:

```sh
cd /opt/profiterol
git pull
./scripts/deploy.sh                 # pull the latest images
./scripts/deploy.sh --build         # or build them here
TAG=<commit-sha> ./scripts/deploy.sh   # deploy, or roll back to, a specific version
```

`deploy.sh` takes a backup first, then replaces the containers and waits until they are healthy. During the switch, the site is unavailable for **a few seconds**: visitors see a "Back in a moment" page (HTTP 503 with `Retry-After`) that reloads by itself. True zero-downtime updates would need two copies of the app running side by side (not set up yet).

## 7. Backups

The `backup` container saves the database (`db-<time>.dump`) and the uploaded files (`uploads-<time>.tar.gz`) into `/opt/profiterol/backups`. It runs every night at `BACKUP_CRON` (default 02:30 in `TZ`) and deletes backups older than `BACKUP_KEEP_DAYS` (default 14).

```sh
C="docker compose -f docker-compose.prod.yml"
$C run --rm backup backup     # back up now
$C run --rm backup list       # list backups
```

**Keep a copy somewhere else.** A backup on the same disk does not survive losing the server. For example, copy the folder to another machine every night with `rsync` or `rclone` from cron.

**Restoring** replaces the current database and uploads:

```sh
$C stop api
$C run --rm backup restore /backups/db-20261004-023000.dump /backups/uploads-20261004-023000.tar.gz
$C start api
```

It asks you to type `restore` to confirm. Leave out the uploads file to restore only the database.

## 8. Day-to-day

```sh
C="docker compose -f docker-compose.prod.yml"
$C ps                 # status and health of every container
$C logs -f api        # follow the API's logs (also: web, nginx, db, backup, certbot)
$C restart web        # restart one service
```

Logs are rotated automatically (5 files of 10 MB per container).

## 9. Hosting in Iran

Servers in Iranian data centers often cannot reach Docker Hub, GitHub Container Registry or npm reliably. Some options:

- Use the registry mirror your hosting provider offers: add it as `registry-mirrors` in `/etc/docker/daemon.json` and restart Docker.
- Build the images on a machine that has access, copy them over, and deploy without pulling:
  ```sh
  # where the images were built
  docker save ghcr.io/hesamtmg/profiterol-api:latest ghcr.io/hesamtmg/profiterol-web:latest | gzip | ssh server 'gunzip | docker load'
  # on the server
  ./scripts/deploy.sh --no-pull
  ```
- Let's Encrypt has to reach your server on port 80 to issue certificates. If that fails, use a certificate from your provider: put `fullchain.pem` and `privkey.pem` in `docker/certbot/conf/live/<DOMAIN>/`.

## Troubleshooting

| Problem | What to check |
|---|---|
| `required variable … is missing a value` | That setting is empty in `.env`. |
| API keeps restarting with `password authentication failed` | `POSTGRES_PASSWORD` changed after the database was created (see the note in step 3). |
| Let's Encrypt fails | DNS must point at this server, and port 80 must be reachable from the internet. Try `STAGING=1` first. |
| "Back in a moment" stays up | `$C ps` and `$C logs api` show which service is unhealthy and why. |
