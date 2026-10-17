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

## Custom blocks built by AI

Admins can have an AI build a block the editor does not have ("a pricing table with three plans…"), without a
developer or a deploy:

1. Each admin connects **their own AI models** in the block builder (**Site settings → Open the block builder**, or
   **Build with AI** in the editor's block library). A model is a provider, any model name, the admin's own API key
   and a daily limit. Providers: Anthropic, OpenAI, OpenRouter (some models free), Google Gemini and Groq (free
   tiers), Ollama (free, on your own server, no key) or any other OpenAI-compatible service. **Load models** asks the
   provider which models the key can use (free ones first). An admin can add as many as they like and pick one per request. Connections belong to one admin on one
   site: other admins, and the same admin on another site, never see or use them. Keys are stored encrypted
   (AES-GCM, keyed from `JWT_SECRET`) and never sent back to the browser.
2. Describe the block, and attach pictures (a design, a screenshot, a logo), PDFs or text files if that helps: they
   are paste-able and drag-and-droppable, go to the AI with that request only, and the conversation keeps just their
   names and small previews. The AI writes its definition (fields + defaults, as above) and a Vue component. The API checks
   both and compiles the component (`apps/api/src/custom-blocks/compile.ts`). When a check fails, the problems go
   back to the AI to fix.
3. Try it in the sandboxed preview, ask for changes, or edit the code by hand. Drafts run only in that frame. It has
   no origin of its own and cannot make requests, so unapproved code never touches the admin.
4. The **owner** approves it. It then appears in the editor under **Custom blocks (AI)** and works like any block.
   Later changes stay in the draft until approved again. A block can be disabled, and it can be deleted once no page
   uses it.

The component can only import a few functions from `vue` and may not use `v-html`, `fetch`, `document`, cookies,
storage or `eval`. The page's Content-Security-Policy still applies on top of that. Approved blocks render in the
browser only, never on the server.

## Custom CSS

- **Site settings → Custom CSS** applies to every page; each page can add its own in the editor (**Design → Custom
  CSS for this page**), which goes live when the page is published. Page CSS comes after the site's, and both come
  after the built-in styles, so they win at the same specificity.
- Every block has the class `pf-block` and one for its kind (`pf-spotlight`, `pf-text`…), or use its anchor
  (`#services`).
- The CSS cannot close its `<style>` tag (`<` is stored as the CSS escape `\3c `), and it is limited to 50,000
  characters.

## Header

- **Site theme → Header** picks its look (each page can choose another in the editor's Design tab): a solid bar, frosted
  glass, a **menu button** opening a full-screen menu with big numbered links (the awakeagency.dev look), the logo in
  the middle, minimal (text only until the page scrolls), a floating dock that hides while scrolling down, a dark
  **bar with the local time** (the mikewilcockdesign.com look; its city and time zone are set in **Site settings → Menu
  and header**), or **shaped buttons** (the undplus.com look): each link in a pill, hexagon or square, black over light
  panels and white over dark ones.
- **Site settings → Menu and header** has the links, a header button ("Get in touch") per language, and an option to
  float the header over the first block of every page. It always floats over the spotlight, big type and giant letters heroes.
- The full-screen menu shows the email and profile links from **Site settings → Business**.

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

## Several sites

One installation can run many websites (`example.com`, `another.com`…), each with its own content, settings,
SEO and users. The owner adds a site by typing its address in **Admin → Sites**, decides when to issue its SSL
certificate and follows each step there. See DEPLOY.md, "Several sites from one install".

## Users and sign-in

The first account comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; it is the **owner**, who manages every site (Admin →
Sites) and is an admin on each. Invite more people to a site in **Admin → Users**: each gets a one-time link to choose
a password (emailed when `SMTP_URL` is set, otherwise copy it to them). **Editors** edit pages, collections, media and
the inbox; **admins** also change settings and users. Both belong to one site.

The admin signs in with an httpOnly session cookie (scripts cannot read it) and every change carries a CSRF token.
Five wrong passwords in a row lock an account for 15 minutes. "Forgot password?" emails a link (to the site's own
address) when `SMTP_URL` is set. Scripts can still call the API with `Authorization: Bearer <token>` from `POST /api/auth/login`.
