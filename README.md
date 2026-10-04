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
npm run test:e2e -w @profiterol/api
```
