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
C="docker compose -f docker-compose.prod.yml"   # behind Oblivion: C="docker compose"
$C ps                 # status and health of every container
$C logs -f api        # follow the API's logs (also: web, nginx, db, backup, certbot)
$C restart web        # restart one service
```

Logs are rotated automatically (5 files of 10 MB per container).

### Mazaheri content

`scripts/seed-mazaheri.mjs` builds the Mazaheri Trading customs-clearance guide in Persian and English. It is not in the images, so run it from the checkout with the API image, which already has Node, sharp and the admin login from `.env`:

```sh
cd /opt/profiterol && git pull
$C run --rm backup backup        # a backup first, in case you want the old content back
$C run --rm --no-deps -v "$PWD/scripts:/seed:ro" -e API_URL=http://api:3001/api api node /seed/seed-mazaheri.mjs
```

That adds a separate page, `/fa/ترخیص-کالا` and `/en/customs-clearance`, and leaves the rest of the site alone. Add `--home` at the end to put it on the home page instead; that also sets the site name, menu, colors and contact details. Running it again updates the same page. If the admin password is no longer the one in `.env`, add `-e ADMIN_EMAIL=… -e ADMIN_PASSWORD=…`.

From your own computer instead (with the repository and `npm install`):

```sh
API_URL=https://your-domain/api ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:mazaheri            # or: -- --home
```

The pictures are generated placeholders, and the numbers and testimonials are examples: replace them in the editor.

### FikkoPrint content

`scripts/seed-fikkoprint.mjs` builds the FikkoPrint site (fikkoprint.com), a printing company that does sublimation printing only (it prints on customers' blanks or its own, and makes no clothes), in Persian and English. By default it uses the Atelier blocks, the warm workshop look of whitecotton.pt (the content is in `scripts/fikkoprint-atelier.mjs`): a studio photo hero, the products strip, four steps from file to printed piece, a showroom shelf of what it prints on, its story in tabs, the studio, stacked capability cards (mug, apparel, metal and gift presses), a library of the surfaces that take sublimation ink, fanned customer quotes, the news, the real place and its facts, questions, an order form and a closing call to action, with the "Atelier Cream" colors. With `--look=animated` it builds the earlier page of animated blocks instead (aurora hero, the heat press, a blank/printed mug before and after, prices by quantity…). Run it like the Mazaheri script, with `SITE` when FikkoPrint is one of several sites:

```sh
$C run --rm --no-deps -v "$PWD/scripts:/seed:ro" -e API_URL=http://api:3001/api -e SITE=fikkoprint.com api node /seed/seed-fikkoprint.mjs --home
```

Without `--home` it adds a separate page, `/fa/چاپ-سابلیمیشن` and `/en/sublimation-printing`. It also creates a **News** collection (`/fa/اخبار`, `/en/news`) with five real 2026 sublimation stories (Mimaki TS330-1800 and its EDP award; Epson SC-F20000, SC-F300 and F370 with its cotton primer), each summarised in both languages with a link to its source, and a news block on the page. Running it again updates those stories instead of adding new ones. With `--home`, it fills the home page and sets the site name, logo mark, menu, colors and contact email. The prices, studio hours, numbers and testimonials are examples: replace them in the editor.

**Photos.** The pictures are real, freely licensed photos from Wikimedia Commons (CC0, CC BY, CC BY-SA or public domain; the list is in `scripts/fikkoprint-photos.mjs`): printed tableware and cushions, a heat press at work, fabric and wide-format printers, a printed mug, bottles, T-shirts, a football shirt, a cushion, a print on aluminium, a puzzle, a phone case, a mouse pad, a coaster, Tehran, and close-ups of the materials. The script reads each one's author and license from Commons, uploads it into the media folder `FikkoPrint · Commons photos` with that credit in its description, and publishes a **Photo credits** page (`/en/photo-credits`, `/fa/اعتبار-عکس‌ها`, linked at the bottom of the home page) listing every photo with its author, license, Commons page and original file. They show the trade in general, not FikkoPrint's own studio or customers (the credits page says so), and the news covers are general printer photos, not the machines in the stories. Visitors load them from the site itself, never from Commons. A later run reuses the photos already uploaded. If Commons cannot be reached, which is likely from a server in Iran, the pictures are drawn instead; `--photos=drawn` draws them all.

**As a preview site.** `PREVIEW=fikkoprint` makes (as the owner, if it is not there yet) and fills the preview site `<PREVIEW_URL>/preview/fikkoprint`, e.g. `https://profiterol.ir/preview/fikkoprint`, for 30 days (`PREVIEW_DAYS`), with the home page, the news and the credits page. The server needs `PREVIEW_URL` (see "Preview sites"). Run it from your own computer, so the photos can be fetched from Commons, with the owner's login:

```sh
PREVIEW=fikkoprint API_URL=https://profiterol.ir/api ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:fikkoprint
```

The script signs in twice per run, and sign-in allows 20 attempts per 15 minutes. Then send it to FikkoPrint with **Admin → Sites → Send admin access**, and **They bought it** moves it to `fikkoprint.com`. Screenshots are in `screenshots-fikkoprint-preview/` (the preview, with photos), `screenshots-fikkoprint-atelier/` (the Atelier look with drawings) and `screenshots-fikkoprint/` (the animated look).

### Kasra content

`scripts/seed-kasra.mjs` builds Kasra Haghdoust's portfolio (kasradesignstudio.com) in Persian and English from the pictures of his old site, [hesamtmg/kasra](https://github.com/hesamtmg/kasra). It uploads all 150 pictures into media folders named `Kasra · …` and creates:

- the story of Kasra's career, mostly animated blocks: aurora hero, opening picture, scroll-lit text, spinning badge, timeline, decoding text, stacking cards, zoom-in picture, hover list, logo strip, picture in letters, before/after, sticky story, photo columns, photo trail, fanning cards, expanding panels, orbit, counters, skill bars, floating photos, scroll-moved words, then contact;
- one page per kind of work, each ending with a gallery of all its pictures: `/identity`, `/logos`, `/low-poly`, `/low-poly-process`, `/nft`, `/illustration` and `/pop-art` (under `/fa/…` and `/en/…`).

The script stops with an error if any picture is left unused. Put the kasra repository next to Profiterol on the server, then run the script with the API image, as for Mazaheri:

```sh
cd /opt && git clone https://github.com/hesamtmg/kasra
cd /opt/profiterol && git pull
C="docker compose -f docker-compose.prod.yml"   # behind Oblivion: C="docker compose"
$C run --rm backup backup
$C run --rm --no-deps -v "$PWD/scripts:/seed:ro" -v /opt/kasra/kasra-app/public/image:/kasra:ro \
  -e API_URL=http://api:3001/api -e SITE=kasradesignstudio.com api node /seed/seed-kasra.mjs --images /kasra --home
```

`SITE` picks the site when one install runs several sites; leave it out otherwise. Without `--home` the story goes on a separate page, `/fa/kasra` and `/en/kasra`, with the colors set on the pages only. With `--home` it goes on the home page, and the script also sets the site name, a transparent copy of Kasra's logo, the favicon, the menu, the yellow and graphite colors, and the contact details. Running it again updates the same pages and does not upload the pictures twice. Add `--dry-run` to check the pictures and build the pages without signing in.

From your own computer instead:

```sh
API_URL=https://kasradesignstudio.com/api ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:kasra -- --images ../kasra --home
```

The story is written from the old site's About page (born 1992, industrial design at Tabriz Islamic Art University) and from the pictures themselves. The timeline's years for the first brands (2017, from the photos' dates) and the NFTs (2021) are best guesses: check them, and the Persian spelling of Kasra's name, in the editor.

### profiterol.ir content

`scripts/seed-profiterol-ir.mjs` builds profiterol.ir, the site that sells Profiterol: a website for any business, with any feature it needs, in Persian and English. The numbers on it are counted from the code each time it runs (67 features in 10 groups, 93 blocks, 113 business types in 12 groups, 10 themes, 14 page and site templates today), so run it again after adding blocks or themes. The page has an aurora hero whose last word cycles through kinds of business, the real editor, the numbers, one real photo for each of the 12 kinds of business, every feature listed and numbered, four steps from a free preview to your own domain, a few highlights, the free preview offer, questions, and a form asking for a preview (it goes to the Inbox). Its pictures are in `scripts/profiterol-ir/`: real photos from Unsplash (see `CREDITS.md` there) and screenshots of Profiterol's own admin, so nothing is downloaded on the server.

```sh
$C run --rm --no-deps -v "$PWD/scripts:/seed:ro" -e API_URL=http://api:3001/api -e SITE=profiterol.ir \
  -e CONTACT_EMAIL=… -e CONTACT_PHONE=… api node /seed/seed-profiterol-ir.mjs --home
```

Without `--home` it adds a separate page, `/fa/ساخت-سایت` and `/en/website-builder`. With `--home` it fills the home page and sets the site name, menu, dark teal colors and country. `CONTACT_EMAIL` and `CONTACT_PHONE` go in the footer and the business details; without them the footer shows neither. Running it again updates the same page and does not upload the pictures twice. The page promises an answer "within one working day" and a free preview: change those words in the editor if they don't fit. Screenshots are in `screenshots-profiterol-ir/`.

## Behind Oblivion (several sites on one server)

When the server already runs other sites behind the shared [Oblivion](https://github.com/hesamtmg/Oblivion) reverse proxy, Profiterol must not take ports 80/443 itself. `docker-compose.oblivion.yml` changes the stack so that:

- this project's nginx publishes no ports and has no TLS; it joins the shared `oblivion` Docker network as `profiterol-nginx` and still serves uploads, security headers and the update page (`docker/nginx/oblivion/default.conf.template`);
- the `certbot` container is not started: Oblivion issues and renews the certificate.

Turn it on in `.env`:

```sh
COMPOSE_FILE=docker-compose.prod.yml:docker-compose.oblivion.yml
```

`deploy.sh`, the GitHub deploy job and plain `docker compose …` commands then use both files. Skip step 5 (`init-letsencrypt.sh`); on the Oblivion side, `nginx/conf.d/profiterol.conf` routes the domain here and `scripts/setup-profiterol.sh` does the whole first install (settings, start, certificate).

## Several sites from one install

One Profiterol (one API, one site app, one database) can run many websites, e.g. `example.com` and `another.com`. Each site has its own pages, collections, media, settings, SEO, inbox, redirects and users; nothing of one shows on another. The site is picked by the address the visitor uses.

The **owner** account manages them all in **Admin → Sites**. On an existing install, the first admin becomes the owner when you update, and everything already there becomes the first site, at `DOMAIN` (with `EXTRA_DOMAINS` as its other addresses). Owners can invite more owners from the same page.

This needs the Oblivion setup above: Oblivion keeps ports 80/443, and the **domains agent** (the `domains` service in `docker-compose.oblivion.yml`) gives every site its address and certificate there. Tell it where Oblivion is checked out, in `.env`:

```sh
OBLIVION_DIR=/root/Oblivion       # the folder with Oblivion's docker-compose.yml
# INTERNAL_TOKEN=…                # optional: its own secret for the agent (default: JWT_SECRET)
```

then `./scripts/deploy.sh`. Within half a minute **Admin → Sites** stops showing "The domains agent is not running".

### Adding a site

1. At the domain's registrar, add an **A record** for `another.com` (and `www.another.com`) pointing to the server. Admin → Sites shows the server's address.
2. In **Admin → Sites → Add site**, type the address. Choose whether to **issue the SSL certificate now** (DNS must already work) and whether to start with the demo pages, and optionally invite the site's admin by email.
3. The site works at once over plain HTTP. If you chose SSL, its **Progress** shows each step as it happens:

   | Step | What is checked |
   |---|---|
   | DNS check | every address points to this server (else nothing is asked of Let's Encrypt, so its limits are not used up) |
   | Let's Encrypt can reach the site | `/.well-known/acme-challenge/` answers through Oblivion |
   | Certificate | Oblivion's `scripts/issue-cert.sh` gets it |
   | Proxy configuration / reload | `nginx/conf.d/profiterol-sites.conf` is written, tested with `nginx -t` (the old one is kept if it fails) and Oblivion reloads |
   | HTTPS check | `https://another.com` answers; the expiry date is recorded |

   A failed attempt says why and is retried by itself after 10, 30 and 60 minutes; **Try again now** skips the wait. **Issue SSL** later, **Renew now** and **Turn SSL off** are on each site.

Certificates renew by themselves (Oblivion's certbot); the agent notices the new date and adds "Renewed" to the timeline. Try the whole flow without using up Let's Encrypt's limits with `LETSENCRYPT_STAGING=1` in `.env` (browsers will warn), then remove it and choose **Renew now**. Behind a CDN, where the domain does not point straight at the server, set `SKIP_DNS_CHECK=1`.

The agent owns `nginx/conf.d/profiterol-sites.conf` in Oblivion (do not edit it) and leaves alone any address that another file there already serves. So the hand-written `profiterol.conf` keeps the first site working until you delete it: once that site shows **Secure** in Admin → Sites, remove `nginx/conf.d/profiterol.conf` from Oblivion and the agent takes the address over within a minute.

### Each site's admin and SEO

**Open admin** signs the owner in to another site's admin with a one-time link (sign-ins are per address). Each site's admins and editors only exist on that site.

Each site has its own **Settings → Search engines (SEO)**: title pattern, default description and share picture, X account, search console verification codes, extra robots.txt lines, and "hide the whole site" while it is being built. Pages and collection items can be hidden from search engines one by one, and pages can have their own share picture. Every site gets its own `/robots.txt` and a sitemap index at `/sitemap.xml` (`/sitemaps/pages.xml` and one per collection, with every language of each page and its pictures), plus structured data: business and website on the home page, breadcrumbs, and articles for collection items. **SEO check** in Admin → Sites lists what to fix.

Scripts that call the API directly (`seed-mazaheri.mjs`, `import-minicms.mjs`) fill one site: add `SITE=another.com` (the first site is used when there is only one).

**Deleting a site** (type its address to confirm) removes everything in it, its files included. The certificate is left in Oblivion. Backups (step 7) hold every site.

### Preview sites

A preview is a ready site to show someone before they buy one. It lives at a path on one of your own sites, e.g.
`https://profiterol.ir/preview/ali-shop`, so it needs no DNS record or certificate of its own.

1. Add the address that will hold the previews (e.g. `profiterol.ir`) as a site in **Admin → Sites**, with SSL.
2. Set `PREVIEW_URL=https://profiterol.ir` in `.env` and update (`docker compose up -d`).
3. **Admin → Sites → New preview site**: a name, its address (`/preview/<name>`), what it starts from (the demo
   content, one of the whole-site templates, or empty), how many days it stays online, and the person's email. Its
   pages are published straight away, and the person is invited as its admin (emailed when `SMTP_URL` is set,
   otherwise copy the link to them).

What the person gets: the whole editor for that one site, with a "Preview site · N days left" strip on the site and
in its admin. Owner-only settings stay locked, and the preview may upload up to `PREVIEW_UPLOAD_MB` (100 MB).
A preview is never indexed (`noindex`, and `Disallow: /preview/` in the host site's robots.txt). Its sign-in cookies
are kept to its path, so they never mix with yours on the host site.

When its days are up the site shows "This preview has ended" (410) and its accounts cannot sign in; owners still
can. **+7 / +14 days** brings it back. It is deleted, files and all, `PREVIEW_GRACE_DAYS` (30) after it ended.

**They bought it** turns it into a normal site: type their address (point its A record at the server first) and it
gets its own certificate, keeping its pages, settings and accounts. The old preview link sends visitors to the new
address, and its name stays taken.

**Previews made by your sites' own admins.** In **Admin → Sites**, a site's settings (the cog) have **Let this
site's admins make preview sites**, with how many may be online at once and the longest each may stay online
(extensions included). Its admins then get **Preview sites** in their admin menu:

- Their previews live under their own site's address, e.g. `https://alistudio.com/preview/cafe-sol`, so no DNS or
  certificate is needed, and "Keep this site" on the preview leads to them, not to you.
- They see only their own previews; you see every preview in Admin → Sites, each marked with the site that made it.
- **Send admin access** gives anyone an admin account on that one preview and a link to choose its password. The
  same button is on your own previews.
- **They bought it** sends you a request with the customer's domain; you do the conversion (it is a new site on your
  server). The request shows on the preview in Admin → Sites and fills in the address.
- Turning the permission off stops new previews; existing ones stay until they end. Deleting the site deletes its
  previews.

nginx (the `profiterol-nginx` container) takes `/preview/<name>` off the address and passes it to the app as
`X-Site-Prefix`; it always overwrites that header, so visitors cannot send their own. Nothing changes in Oblivion.

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
