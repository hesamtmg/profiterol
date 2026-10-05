# Browser tests

Playwright scripts that drive the real site and admin: forms, the editor, collections, themes, the classic and
animated blocks, the Persian admin, responsive images, sign-in security and user management.

They need a running site on a **freshly migrated database** (the suites create pages and collections with fixed
names). Pictures, logos, a font and a short video are generated on the fly, so nothing outside the repo is needed
(the video needs `ffmpeg`; without it the video checks fail).

```bash
# API on :3001 and Nuxt on :3000, then a stand-in for nginx on :8080:
node e2e/proxy.mjs &
npm run e2e                     # seeds the demo pages, then runs every suite
npm run e2e -- editor themes    # only some suites (seed first, or set SKIP_SEEDS=1 if already seeded)
```

Screenshots land in `e2e/.output/<suite>/` (not committed; CI uploads them as an artifact).

Settings: `BASE_URL` (default `http://localhost:8080`), `API_URL`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and
`CHROMIUM_PATH` to use an already installed Chromium.

Each suite is a plain script: `check(name, ok)` prints `PASS` / `FAIL`, `watch(page)` collects page and console
errors, and `finish()` sets the exit code. The API has its own tests: `npm run test:api`.
