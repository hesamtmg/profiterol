# profiterol

A Wix-style website builder: drag blocks onto a page, edit them in a live preview, and publish in Persian (RTL) and English (LTR).

- **apps/api**: NestJS + TypeORM + Postgres. Auth, pages (draft/publish), collections (projects, blog…), site settings, media uploads.
- **apps/web**: Nuxt 3. The server-rendered public site and the `/admin` editor.
- **packages/blocks**: the block registry shared by both. Each block's fields and defaults are declared once.

The roadmap is in [CHECKLIST.md](./CHECKLIST.md).

## Run with Docker

```sh
cp .env.example .env        # then change the passwords and JWT_SECRET
docker compose up --build
```

- Site: http://localhost/ (redirects to `/fa` or `/en`)
- Admin: http://localhost/admin. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, which default to `admin@example.com` / `admin12345`.

On first start the API runs the database migrations, then creates the admin user, default settings, a Projects and a Blog collection with sample items, and a demo home page in both languages.

## Put it online

See **[DEPLOY.md](./DEPLOY.md)**: HTTPS with Let's Encrypt, nightly backups and restores, updates from GitHub Actions, and notes for hosting in Iran.

## Run locally without Docker

You need Node 20+ and a Postgres database.

```sh
npm install
npm run build -w @profiterol/blocks

# terminal 1: API on :3001 (runs migrations on start)
DATABASE_URL=postgres://user:pass@localhost:5432/profiterol npm run dev:api

# terminal 2: site + admin on :3000 (proxies /api and /uploads to :3001)
npm run dev:web
```

## Adding a block

1. Add its definition (fields + defaults) to `packages/blocks/src/registry.ts`.
2. Create `apps/web/components/blocks/YourBlock.vue`. It receives the block's props as `p` and the current `locale`.
   Use container-query variants (`@3xl:`) instead of `md:` so the editor's tablet and mobile previews work.
   Wrap text in `<EditableText :value="p.title" path="title" />` so it can be edited in place on the canvas
   (use `multiline` for long text and paths like `items.2.text` inside lists).
3. Register it in `apps/web/components/blocks/index.ts`.

The API validation and the editor's property form come from the definition automatically.

## Collections

Collections hold content that repeats: projects, blog posts, team members. Each has its own fields (set in **Admin → Collections → Fields & settings**) and every item has a version per language.

- `/{locale}/{collection}` lists the published items, for example `/en/projects`.
- `/{locale}/{collection}/{item}` is the item's own page.
- The **Collection list** block shows the latest items on any page.

## Database changes

Tables are managed by TypeORM migrations in `apps/api/src/migrations`, and pending migrations run when the API starts. After changing an entity:

```sh
DATABASE_URL=postgres://… npm run migration:generate -w @profiterol/api --name=AddSomething
```

CI fails if the entities and the migrations disagree.

## Tests

```sh
npm run build -w @profiterol/blocks && npm test -w @profiterol/blocks
npm run typecheck

# API end-to-end tests: start the API against an empty database first
npm run test:api

# Browser tests (site, editor, admin): see e2e/README.md
node e2e/proxy.mjs &   # stands in for nginx on :8080
npm run e2e

# Lint and formatting (also run on staged files before each commit)
npm run lint
```

## Moving from minicms

```sh
npm run import:minicms -- minicms-dump.sql --uploads /path/to/minicms/public/uploads --publish
```

The dump is a MySQL dump of the minicms database. Profiterol must be running (it signs in as `ADMIN_EMAIL` /
`ADMIN_PASSWORD` at `API_URL`, default `http://localhost:3001/api`). It brings over:

- pages, with each section (the 12 minicms kinds) as the matching classic block, in Persian and English;
- posts into the Blog collection and projects into Projects;
- the pictures and videos they use, from `--uploads`;
- a redirect from every old address (`/page/…`, `/post/…`, `/blog/…`, `/projects/…`) to its new page, so links and
  search results keep working (see **Admin → Redirects**).

Run it with `--dry-run` first to see what it finds. Running it again skips what is already there.

## Users and sign-in

The first admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Invite more people in **Admin → Users**: each gets a
one-time link to choose a password (emailed when `SMTP_URL` is set, otherwise copy it to them). **Editors** edit pages,
collections, media and the inbox; **admins** also change settings and users.

The admin signs in with an httpOnly session cookie (scripts cannot read it) and every change carries a CSRF token.
Five wrong passwords in a row lock an account for 15 minutes. "Forgot password?" emails a link when both `SMTP_URL`
and `SITE_URL` are set. Scripts can still call the API with `Authorization: Bearer <token>` from `POST /api/auth/login`.
