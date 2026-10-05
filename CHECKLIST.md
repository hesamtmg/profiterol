# Profiterol: roadmap to a Wix-style CMS

Stack: **NestJS** (API), **Nuxt** (site + editor), **Postgres**, all in **Docker** with **nginx** in front.
Languages: **Persian (RTL) + English (LTR)**, with room for more.

This combines:

- **minicms**: the feature set. Section-based pages, blog, settings, SEO, sitemap, maintenance mode, page loader, roles, FA/EN, modules (projects, team, FAQ, partners, careers, contact, feedback).
- **amsr-portfolio**: the look. Big white panels with 4rem corners on a brand-color background, 900/200 font weights, card grids, expanding person cards, FAQ accordion, slow 1s motion, RTL.

`[x]` means done in this repository. `[ ]` means still to do. Phases are roughly in order, but phases 6 to 9 can be done in parallel.

---

## Phase 0: Foundations
- [x] Monorepo with npm workspaces (`apps/api`, `apps/web`, `packages/blocks`)
- [x] `docker-compose.yml`: postgres, api, web, nginx
- [x] Multi-stage Dockerfiles for api and web (small runtime images, non-root user)
- [x] nginx: `/api` → Nest, `/uploads` straight from the volume, everything else → Nuxt; gzip, security headers, long cache for `/_nuxt`
- [x] `.env.example` covering every setting
- [ ] ESLint + Prettier config shared across the workspaces
- [x] CI (GitHub Actions): build, unit tests, API end-to-end tests against Postgres, migration drift check, web build, Docker build
- [ ] Pre-commit hook (lint-staged)

## Phase 1: Core data and auth
- [x] Users table with bcrypt password hashes and a role (`admin` or `editor`)
- [x] JWT login (`POST /api/auth/login`), `GET /api/auth/me`, and an auth guard with `@Roles()`
- [x] First admin created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start
- [x] Locales declared once (`packages/blocks/src/locales.ts`) instead of `*_en` columns
- [x] **TypeORM migrations**, run automatically on start (`npm run migration:generate --name=X -w @profiterol/api` after changing an entity)
- [ ] User management screen: invite, change role, deactivate
- [ ] Password reset by email; optional 2FA (minicms had both)
- [ ] Rate-limit login (`@nestjs/throttler`) and lock out after repeated failures
- [ ] Fine-grained permissions (minicms used spatie/permission): per-collection create/edit/publish
- [ ] Audit log: who changed what, when

## Phase 2: Pages and the block system
- [x] **One block registry** (`packages/blocks`): each block declares its fields and defaults once. The API validates with it, the editor builds its forms from it and the site renders from it. This fixes minicms's 1,000-line `switch`.
- [x] Pages with one translation per locale (title, slug, SEO fields, blocks as JSONB)
- [x] Draft vs published: `blocks` are the draft, and **Publish** copies them to `publishedBlocks`
- [x] Slugs unique per language, Persian slugs allowed, automatic `-2` suffix for new pages
- [x] Home page flag (only one page at a time)
- [x] Validation: unknown blocks/fields, wrong types, `javascript:` links and bad colors are rejected
- [x] Unit tests for the registry and validation (`npm test -w @profiterol/blocks`)
- [ ] Page revisions: keep the last N versions and allow restoring one
- [ ] Scheduled publishing (minicms `expire_time` / publish at)
- [ ] Nested blocks (columns/containers holding other blocks)
- [x] Per-block visibility: show on all devices, phones only, or tablets and desktops only (badge and dimming in the editor's previews)
- [ ] Per-block style options: background color/image, spacing, full-bleed vs panel
- [ ] Duplicate a page; move pages into folders; parent/child URLs

## Phase 3: Public site renderer
- [x] Nuxt SSR pages at `/{locale}/{slug}`, with `/{locale}` as the home page and `/` redirecting by `Accept-Language`
- [x] `lang` / `dir` on `<html>`; Vazirmatn for Persian, Inter for Latin script
- [x] Theme tokens → CSS variables (colors, corner radius, fonts)
- [x] SEO: title, description, Open Graph, `hreflang` alternates
- [x] `sitemap.xml` and `robots.txt`
- [x] 404 / error page in both languages
- [x] Maintenance mode with a message per language
- [x] Site header with menu (hovering one link blurs the others, as in AMSR), a language switch that keeps you on the same page, and a mobile overlay menu
- [x] Page loader (minicms): percentage, top bar or site-name fill; real loading progress, a blurred background picture that sharpens, once per visit; removed by CSS after 8 s without JavaScript
- [x] Section-by-section scroll mode (minicms “magic scroll”), a theme setting per site or page
- [ ] Canonical URL setting (minicms hardcoded its domain)
- [ ] Self-host fonts (no Google Fonts call) and preload them
- [ ] Google Tag Manager / analytics setting
- [ ] Cache published pages (nginx micro-cache or Nitro route cache) and purge on publish
- [ ] Custom cursor option (both projects had one)

## Phase 4: Visual editor (the Wix part)
- [x] Three-panel editor: block library, live canvas, property panel
- [x] Canvas renders the **real** site components, so what you see is what gets published
- [x] Add blocks by clicking, or by dragging from the library onto the page
- [x] Reorder by dragging (canvas handle or Layers panel), plus up/down/duplicate/delete toolbar
- [x] Property forms generated from the registry: text, textarea, URL, image (media picker + upload), color, select, number, toggle, and repeatable lists
- [x] Desktop / tablet / mobile preview that **really reflows** (blocks use container queries, not viewport media queries)
- [x] Language switch in the editor; the canvas flips to RTL for Persian
- [x] "Copy blocks from the other language" to start a translation
- [x] Undo / redo per language; keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Shift+Z, Delete, Esc)
- [x] Unsaved-changes guard; Save and Publish buttons; live/draft status
- [x] **Inline text editing**: click any text on the canvas and type; the property panel and undo history follow along
- [x] Autosave a few seconds after each change (pages, and collection items while they are drafts), with an on/off switch
- [x] Drop a photo onto a block to use it as that block's image; drop or paste images into any image field, the media library window and the Media page
- [ ] Rich text field (bold, italic, links, lists) with sanitized HTML output
- [ ] Block presets / "sections": save a configured block and reuse it
- [ ] Shareable draft preview link (signed token)
- [x] Editor UI in Persian as well as English: a فارسی / English switch in the header, login and editor; right-to-left layout; remembered per browser; block names, fields and help text translated
- [ ] Real-time multi-user awareness (someone else is editing this page)

## Phase 5: Blocks
From **amsr-portfolio**:
- [x] Full-screen spotlight hero from the redesigned AMSR home: cross-fading photo per person, tall side cards (logo + cut-out photo) that switch person, button in the next person's color, moving text, scroll hint, frosted header floating over it (`spotlight`)
- [x] Expanding person/feature cards hero (`hero-cards`)
- [x] Card grid in 3 styles: plain icon cards (AMSR services), raised hover cards, photo cards (`card-grid`)
- [x] FAQ accordion (`faq`)
- [x] Marquee text (`marquee`)
- [x] Statement with background image and CTA (`statement`)
- [x] Contact + footer (`contact-footer`)

From **minicms**'s 12 section kinds (`scrollview/kinds/kind-1 … 12`), each rebuilt as its own block under “Classic sections” in the editor, with a separate phone photo/video where minicms had one and the same scroll-in animations:
- [x] 1 · Full-screen muted video with a light title, plus a phone version (`video-cover`)
- [x] 2 · Title over three wide photo links that zoom and slide their text up on hover (`triple`)
- [x] 3 · Full-width photo, blurred behind a centered title and text (`horizon`)
- [x] 4 · Side by side: big number/title with a two-line label, paragraphs that open on hover, frosted button (`side-by-side`)
- [x] 5 · Tall photo right, title and text beside it (`horizon-right`)
- [x] 6 · Tall photo left, title and text beside it (`horizon-left`)
- [x] 7 · Photo beside a frosted-glass contact form with address and email; messages go to the inbox (`contact-split`)
- [x] 8 · Information: title and intro, then a longer text with its own heading beside a portrait photo (`information`)
- [x] 9 · Free formatted text from an editor toolbar (headings, bold, lists, quotes, links); the API keeps only safe HTML (`rich-text`)
- [x] 10 · Video in its own player: seek bar, volume, ±5 s, speed menu, full screen, keyboard keys, blurred glow (`video-showcase`)
- [x] 11 · Full-screen fading slider with caption, button and arrows on glass pills; autoplay, swipe, arrow keys (`slider`)
- [x] 12 · Chessboard grid of rows × columns with its own phone size; links or a larger view with the text (`photo-grid`)
- [x] The minicms bottom bar: with “Section by section” scrolling, a glass bar shows the current section's title (from its heading) with previous/next buttons, plus dots at the side

General blocks that cover the same ground in the newer style:
- [x] Image + text, image on either side (`image-text`); text (`text`); statement with a fixed (parallax) background (`statement`)
- [x] Video hero (`video-hero`), video player with YouTube / Aparat links (`video`), carousel with dots (`carousel`), gallery with masonry and a full-screen viewer (`gallery`), contact form with editable fields (`contact-form`)

New:
- [x] Logos strip, testimonials, stats/counters, team (flip cards): see Animated below
- [x] Pricing table with a monthly/yearly switch (`pricing`), OpenStreetMap map with directions links (`map`), spacer/divider with line, dots, wave, slant or curve (`spacer`)

Animated (Wix-style motion; every one holds still for visitors who turn off animations):
- [x] **Entrance animation** on every block, like Wix's Animation panel: fade, float up, slide from either side, zoom, flip, blur, wipe. Plays when the block scrolls into view; the hidden start is rendered on the server so nothing flashes; picking one in the editor replays it on the canvas
- [x] Aurora hero: drifting glows, words rising in one by one, a changing word with a shimmering gradient, a light following the mouse (`aurora-hero`)
- [x] Scroll-lit text: words light up as the visitor scrolls (`scroll-text`)
- [x] Counters that count up when seen; real numbers in the server page, Persian digits in Persian (`counters`)
- [x] Logo strip gliding endlessly, one or two rows, light or dark (`logo-strip`)
- [x] Horizontal scroll: the page pins while cards slide sideways, with a progress bar; a swipe row on phones (`horizontal-scroll`)
- [x] 3D tilt cards with a moving shine (`tilt-cards`)
- [x] Flip cards (hover, tap or keyboard) (`flip-cards`)
- [x] Before / after slider with a hint sweep; drag, touch or arrow keys (`before-after`)
- [x] Testimonials with filling progress bars, pause on hover (`testimonials`)
- [x] Timeline whose line draws as you scroll (`timeline`)
- [x] Parallax layers: pictures (or built-in hills in the theme colors) moving at different speeds with scroll and mouse, title passing behind the front layers (`parallax`)
- [x] Sticky story: a picture pinned while steps scroll beside it, cross-fading to each step's picture; inline pictures on phones (`sticky-story`)
- [x] Cursor effects, a theme setting (site or page): dot and trailing ring, soft glow, or inverting circle; mouse/trackpad only, normal pointer over text fields
- [x] Page transitions, a theme setting: fade, slide, curtain (with the site name) or circle from the click; the uncovering is pure CSS in the server page; Back button safe
- [x] Both previewed live on the editor canvas from the Design tab; ready-made themes keep the motion settings
- [x] **Collection list** block: shows a collection's latest items as cards, with optional tag filters and a “see all” link

## Phase 6: Collections (the Wix "CMS" part)
- [x] Generic collections and items: built-in title, address, summary, story, tags and cover, plus custom fields (short/long text, link, image, gallery, number, yes/no, color) with labels per language
- [x] Field builder in the admin; values are checked against it on save
- [x] Items have draft/published status, one version per language, and addresses unique per collection and language
- [x] Blog collection seeded (posts with tags and an author field)
- [ ] Blog extras: categories as their own list, reading time, view count (minicms had these)
- [x] Projects collection seeded, shown as AMSR-style cards with a detail page (cover, story, details, gallery with lightbox, related items)
- [ ] Team, FAQ, partners, careers (jobs + applications), feedback: create these as collections in the admin; careers applications need forms (Phase 8)
- [x] Item pages at `/{locale}/{collection}/{item}` and an automatic index page at `/{locale}/{collection}`, in the sitemap and with hreflang
- [ ] Let editors design the item page layout with blocks (template page)
- [ ] Search across pages and items
- [x] Filter by tag (block setting and clickable chips)
- [ ] Manual ordering and pagination

## Phase 7: Media library
- [x] Upload (JPG, PNG, WebP, GIF, AVIF, MP4, WebM; 20 MB; no SVG), random file names, list, delete
- [x] Media picker inside the editor
- [x] Check the file's real type from its first bytes instead of trusting the browser's MIME type
- [x] Image processing (sharp): WebP copies at 480 / 960 / 1600 / 2400 px (never enlarged, EXIF-rotated), responsive `srcset` + `sizes` on every site image, rendered on the server; older photos are converted on start
- [ ] Blur placeholder while a photo loads; AVIF copies
- [ ] Alt text per language; folders/tags; search; usage tracking ("used on 3 pages")
- [ ] S3-compatible storage option (MinIO in Docker)

## Phase 8: Forms and inbox
- [x] Form block with editable fields; the API checks every answer against the published form (required, email, phone, choices, length), with messages in the visitor's language
- [x] Inbox in the admin: unread badge, read/unread, reply by email, delete, CSV export (opens in Excel with Persian intact)
- [x] Email notifications through SMTP (`SMTP_URL`) to the address set in Site settings
- [ ] SMS notifications (minicms used IPPanel)
- [x] Spam protection: hidden honeypot field, minimum fill time, 5 messages per 10 minutes per visitor
- [ ] Optional captcha
- [ ] File uploads in forms (e.g. CVs for career applications)

## Phase 9: Site settings and branding
- [x] Site name per language, logo, favicon
- [x] Menu editor (labels per language, page/anchor/URL links)
- [x] Theme editor: colors, corner radius, fonts, with live preview
- [x] Ready-made themes (AMSR Teal, AMSR Night, Sand, Minimal, Ocean, Rose), button shape (pill/rounded/square), solid or frosted-glass header, a wider choice of Persian and Latin fonts
- [x] Theme per page: a page uses the site theme or its own; edited from the editor's Design tab with the canvas updating live. A page's own theme is a draft until Publish; site theme changes there apply to every page
- [x] Upload your own fonts (WOFF2, WOFF, TTF, OTF; one file per weight) in Site settings; they appear in every theme's font lists and are served with `@font-face`
- [x] Save your own themes under a name (Site settings or the editor's Design tab) and reuse them on any page
- [ ] Footer and social links as settings, used by the header/footer blocks
- [ ] Multiple menus and dropdowns
- [ ] Redirects manager (old URL → new URL), useful when migrating minicms content
- [ ] Custom CSS / head code (admin only)

## Phase 10: Templates and multi-site
- [ ] Page templates ("About", "Services", "Contact") to start from
- [ ] Whole-site templates (an AMSR-style template, a minicms "studio" template)
- [ ] Import minicms data (pages/page_details/posts → pages/blocks/collections)
- [ ] Multi-site: `sites` table, all content scoped by `site_id`, custom domains, per-site theme
- [ ] Sign-up and plans if this becomes a hosted product

## Phase 11: Quality and security
- [x] API end-to-end tests against a real Postgres (`npm run test:e2e -w @profiterol/api`), run in CI
- [ ] Component tests for blocks (Vitest) and Playwright tests for the editor
- [ ] Content-Security-Policy for the site and admin
- [x] Login cookie is marked Secure when the site runs on HTTPS
- [ ] Store the JWT in an httpOnly cookie, with CSRF protection, instead of a JS-readable cookie
- [ ] Helmet, request size limits and CORS rules on the API
- [ ] Accessibility pass: focus states, contrast checks in the theme editor, reduced motion (done for the marquee)
- [ ] Lighthouse budget: LCP < 2.5s on mobile

## Phase 12: Deployment and operations
See [DEPLOY.md](./DEPLOY.md).
- [x] Production compose (`docker-compose.prod.yml`): HTTPS with Let's Encrypt (certbot, automatic renewal), HTTP→HTTPS, HTTP/2, HSTS and security headers, other host names redirected to the main domain
- [x] Required secrets: the stack refuses to start while a password, JWT secret or domain is missing
- [x] Nightly `pg_dump` backups plus uploads archive, old ones pruned, restore script with confirmation; backup → data loss → restore tested end to end
- [x] Health checks for db, api, web and nginx; restart policies; log rotation
- [x] CI builds images and pushes them to GitHub Container Registry (`latest` + commit SHA); optional SSH deploy on every push to `main`
- [x] `scripts/deploy.sh`: backup, pull or build, restart, wait until healthy; roll back with `TAG=<sha>`; `--no-pull` for servers without registry access
- [x] Friendly bilingual "back in a moment" page (503 + Retry-After) while containers restart; tested: 1 of 310 requests affected during an update
- [x] CI checks the production files: shellcheck, compose config, nginx config, backup image
- [ ] True zero-downtime updates (two app copies side by side, blue/green)
- [ ] Off-site backup copies (rsync/rclone/S3) and backup-failure alerts
- [ ] Uptime monitoring and metrics (e.g. Uptime Kuma, Grafana)
- [ ] Postgres tuning for the server's memory; connection pooling if traffic grows
