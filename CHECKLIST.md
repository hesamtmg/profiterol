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
- [ ] CI (GitHub Actions): install, build, test, and Docker build on every PR
- [ ] Pre-commit hook (lint-staged)

## Phase 1: Core data and auth
- [x] Users table with bcrypt password hashes and a role (`admin` or `editor`)
- [x] JWT login (`POST /api/auth/login`), `GET /api/auth/me`, and an auth guard with `@Roles()`
- [x] First admin created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start
- [x] Locales declared once (`packages/blocks/src/locales.ts`) instead of `*_en` columns
- [ ] **TypeORM migrations** instead of `DB_SYNC=true` (generate the first migration from the current entities)
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
- [ ] Per-block visibility: hide on mobile or desktop
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
- [ ] Page loader / splash (minicms loader settings + the AMSR splash animation)
- [ ] Optional full-page vertical scroll mode (AMSR Swiper / minicms "magic scroll")
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
- [ ] **Inline text editing**: double-click text on the canvas to edit it in place
- [ ] Autosave drafts every few seconds
- [ ] Drag-and-drop media straight onto image fields
- [ ] Rich text field (bold, italic, links, lists) with sanitized HTML output
- [ ] Block presets / "sections": save a configured block and reuse it
- [ ] Shareable draft preview link (signed token)
- [ ] Editor UI in Persian as well as English
- [ ] Real-time multi-user awareness (someone else is editing this page)

## Phase 5: Blocks
From **amsr-portfolio**:
- [x] Expanding person/feature cards hero (`hero-cards`)
- [x] Card grid in 3 styles: plain icon cards (AMSR services), raised hover cards, photo cards (`card-grid`)
- [x] FAQ accordion (`faq`)
- [x] Marquee text (`marquee`)
- [x] Statement with background image and CTA (`statement`)
- [x] Contact + footer (`contact-footer`)

From **minicms**'s 12 section kinds:
- [x] Image + text, image on either side (kinds 3–6) (`image-text`)
- [x] Text (`text`)
- [ ] Video hero, autoplay muted (kind 1)
- [ ] Three images (kind 2)
- [ ] Fixed/parallax image left/right (kinds 5–6)
- [ ] Contact form (kind 7). Needs Phase 8.
- [ ] Info/request form (kind 8) and complex form (kind 9)
- [ ] Video player (kind 10)
- [ ] Carousel / slider (kind 11, plus the minicms sliders table)
- [ ] Gallery grid with lightbox (kind 12)

New:
- [ ] Team members, partners/logos strip, testimonials, pricing table, stats/counters, map, spacer/divider, embed (YouTube, Aparat)
- [ ] **Collection list** block: shows items of any collection as cards (Phase 6)

## Phase 6: Collections (the Wix "CMS" part)
- [ ] Generic `collections` + `collection_items` (JSONB fields + per-locale values) with a field-schema editor
- [ ] Blog: posts, categories, tags, author, reading time, view count (port from minicms)
- [ ] Projects / portfolio, shown as AMSR-style cards with a detail page
- [ ] Team, FAQ, partners, careers (jobs + applications), feedback
- [ ] Dynamic pages: `/blog/{slug}` and `/projects/{slug}` from a template page
- [ ] Search across pages and items
- [ ] Filtering and sorting on collection-list blocks

## Phase 7: Media library
- [x] Upload (JPG, PNG, WebP, GIF, AVIF, MP4, WebM; 20 MB; no SVG), random file names, list, delete
- [x] Media picker inside the editor
- [ ] Check the file's real type from its first bytes instead of trusting the browser's MIME type
- [ ] Image processing (sharp): resize, WebP/AVIF, responsive `srcset`, blur placeholder
- [ ] Alt text per language; folders/tags; search; usage tracking ("used on 3 pages")
- [ ] S3-compatible storage option (MinIO in Docker)

## Phase 8: Forms and inbox
- [ ] Form-builder block (fields, required, validation) whose submissions go to the API
- [ ] Inbox in the admin, with CSV export
- [ ] Email notifications (SMTP) and optional SMS (minicms used IPPanel)
- [ ] Spam protection: honeypot + rate limit + optional captcha

## Phase 9: Site settings and branding
- [x] Site name per language, logo, favicon
- [x] Menu editor (labels per language, page/anchor/URL links)
- [x] Theme editor: colors, corner radius, fonts, with live preview
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
- [ ] API e2e tests (Jest + Supertest against a test Postgres)
- [ ] Component tests for blocks (Vitest) and Playwright tests for the editor
- [ ] Content-Security-Policy for the site and admin
- [ ] Store the JWT in an httpOnly cookie, with CSRF protection, instead of a JS-readable cookie
- [ ] Helmet, request size limits and CORS rules on the API
- [ ] Accessibility pass: focus states, contrast checks in the theme editor, reduced motion (done for the marquee)
- [ ] Lighthouse budget: LCP < 2.5s on mobile

## Phase 12: Deployment and operations
- [ ] Production compose: TLS (Let's Encrypt via certbot or Caddy), HTTP→HTTPS, HSTS
- [ ] Nightly `pg_dump` backups plus uploads backup, with a tested restore
- [ ] Health checks for api/web in compose; restart policies (done)
- [ ] Logs and metrics (pino + Loki/Grafana, or a hosted option)
- [ ] Zero-downtime deploys (build images in CI, push to a registry, `docker compose pull && up -d`)
