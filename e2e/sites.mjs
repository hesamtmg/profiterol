// Several sites in one installation, seen in the browser: the owner adds a site in Admin → Sites, follows its
// certificate's progress (the domains agent is played by this script through /api/internal), opens its admin with a
// one-time link, and each site shows its own pages and search engine tags. Sites use *.localhost addresses, which
// browsers send to this machine. Needs INTERNAL_TOKEN to match the API's.
import http from 'node:http';
import { BASE, adminLogin, apiToken, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('sites');
const port = new URL(BASE).port || '80';
const domain = `shop-${Date.now().toString(36)}.localhost`;
const siteUrl = `http://${domain}:${port}`;
const INTERNAL = process.env.INTERNAL_TOKEN ?? 'agent-secret';
const token = await apiToken();

/**
 * The API as one site sees it: sent through the proxy with that site's address as Host, as its pages are (Node's
 * fetch cannot set Host, and does not resolve *.localhost).
 */
function call(method, path, { host = new URL(BASE).hostname, body, headers = {} } = {}) {
  const data = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: `/api${path}`,
        method,
        headers: {
          host: `${host}:${port}`,
          authorization: `Bearer ${token}`,
          ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () =>
          res.statusCode < 400
            ? resolve(text ? JSON.parse(text) : null)
            : reject(new Error(`${method} ${path}: ${res.statusCode} ${text.slice(0, 300)}`)),
        );
      },
    );
    req.on('error', reject);
    req.end(data);
  });
}
/** A page of the new site, as text. */
const get = (path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path, headers: { host: `${domain}:${port}` } }, (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve(text));
      })
      .on('error', reject);
  });
const agent = (method, path, body) => call(method, `/internal${path}`, { body, headers: { 'x-internal-token': INTERNAL } });

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
// The agent is not running in tests (its warning is part of the page); 401 is the expired-link check below.
const ad = watch(await ctx.newPage(), /status of 401/);
await adminLogin(ad);

// ---------- Add a site without SSL ----------
await ad.click('nav a[href="/admin/sites"]');
await ad.waitForSelector('h1:has-text("Sites")');
// A run just before this one may have played the agent; the warning is for an agent that is not reporting.
const seen = (await call('GET', '/admin/sites')).agent?.lastSeen;
const agentQuiet = !seen || Date.now() - new Date(seen).getTime() > 2 * 60_000;
check('the owner sees Sites, with a warning while no agent reports in', (await ad.isVisible('[data-testid=agent-offline]')) === agentQuiet);
check('the site you are on is marked', await ad.isVisible('article:has-text("you are here")'));
await ad.click('button:has-text("Add site")');
await ad.fill('#site-domain', `https://${domain}/`);
await ad.fill('#site-name', 'Corner Shop');
await ad.uncheck('[data-testid=issue-ssl]');
check('the form explains the DNS record to add', (await ad.textContent('[data-testid=add-site]')).includes(`A record for ${domain}`));
await ad.screenshot({ path: `${out}01-add-site.png`, fullPage: true });
await ad.click('[data-testid=add-site] button[type=submit]');
const card = ad.locator(`article[data-site="${domain}"]`);
await card.waitFor();
check('the new site is listed with its www. address', (await card.textContent()).includes(`www.${domain}`));
check('no certificate until the owner asks', (await card.locator('[data-ssl]').getAttribute('data-ssl')) === 'none');

// ---------- Each site shows its own content and tags ----------
const visitor = watch(await browser.newPage());
await visitor.goto(`${siteUrl}/en`, { waitUntil: 'networkidle' });
check('the new site has its own name', (await visitor.title()) === 'Corner Shop');
check('its canonical link is its own address', (await visitor.getAttribute('link[rel=canonical]', 'href')) === `${siteUrl}/en`);
await visitor.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
check('the first site is unchanged', (await visitor.title()) !== 'Corner Shop');

const shop = (await call('GET', '/admin/sites')).sites.find((s) => s.primary === domain);
await call('PUT', '/admin/settings', {
  host: domain,
  body: { seo: { titleTemplate: { en: '%s | Corner Shop' }, verification: { google: 'corner-google-123' }, twitter: 'cornershop' } },
});
await visitor.goto(`${siteUrl}/en/projects`, { waitUntil: 'networkidle' });
check('titles follow the site’s pattern', (await visitor.title()) === 'Projects | Corner Shop');
check(
  'the verification tag is on its pages',
  (await visitor.getAttribute('meta[name=google-site-verification]', 'content')) === 'corner-google-123',
);
check('twitter:site is set', (await visitor.getAttribute('meta[name="twitter:site"]', 'content')) === '@cornershop');
const ld = await visitor.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
check(
  'collection pages have a breadcrumb trail',
  ld.some((d) => d['@type'] === 'BreadcrumbList'),
);
const item = await visitor.$eval('a[href*="/en/projects/"]', (a) => a.getAttribute('href'));
await visitor.goto(`${siteUrl}${item}`, { waitUntil: 'networkidle' });
const itemLd = await visitor.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
check(
  'items have Article structured data',
  itemLd.some((d) => d['@type'] === 'Article' && d.headline),
);
check('items say when they were published', !!(await visitor.getAttribute('meta[property="article:published_time"]', 'content')));
const index = await get('/sitemap.xml');
check('the sitemap index lists the site’s own sitemaps', index.includes(`${siteUrl}/sitemaps/pages.xml`) && !index.includes(`${BASE}/`));
const pagesMap = await get('/sitemaps/pages.xml');
check('sitemaps give every language of a page', /hreflang="fa"/.test(pagesMap) && /hreflang="x-default"/.test(pagesMap));
check('robots.txt points at the site’s sitemap', (await get('/robots.txt')).includes(`Sitemap: ${siteUrl}/sitemap.xml`));

// ---------- The certificate: the owner decides, and follows each step ----------
await card.locator('[data-testid=request-ssl]').click();
await ad.waitForFunction(
  (d) => document.querySelector(`article[data-site="${d}"] [data-ssl]`)?.getAttribute('data-ssl') === 'queued',
  domain,
);
check(
  'Issue SSL queues it and opens the progress',
  await card
    .locator('[data-testid=ssl-timeline] [data-step=queued]')
    .last()
    .waitFor()
    .then(
      () => true,
      () => false,
    ),
);
check('the agent now sees it as due', (await agent('GET', '/sites')).find((s) => s.id === shop.id).due);
// What the agent reports while it works (see docker/domains/agent.sh).
await agent('POST', '/heartbeat', { serverIp: '203.0.113.7', version: 'e2e' });
for (const [step, message] of [
  ['dns', `${domain} points to 203.0.113.7`],
  ['challenge', 'Let’s Encrypt can reach the site'],
  ['certificate', 'Certificate issued'],
  ['nginx', 'profiterol-sites.conf written and tested'],
]) {
  await agent('POST', `/sites/${shop.id}/events`, { step, state: 'running', message: `${step}…` });
  await agent('POST', `/sites/${shop.id}/events`, { step, state: 'ok', message });
}
await ad.waitForFunction(
  (d) => document.querySelectorAll(`article[data-site="${d}"] [data-testid=ssl-timeline] [data-state=ok]`).length >= 5,
  domain,
  { timeout: 10_000 },
);
check('each step shows up while it runs', (await card.locator('[data-ssl]').getAttribute('data-ssl')) === 'running');
await ad.screenshot({ path: `${out}02-ssl-progress.png`, fullPage: true });
await agent('POST', `/sites/${shop.id}/ssl`, {
  ok: true,
  message: 'Secure',
  expires: new Date(Date.now() + 90 * 86_400_000).toISOString(),
});
await ad.waitForFunction(
  (d) => document.querySelector(`article[data-site="${d}"] [data-ssl]`)?.getAttribute('data-ssl') === 'active',
  domain,
  {
    timeout: 10_000,
  },
);
check('the site becomes secure, with its expiry date', (await card.textContent()).includes('Valid until'));
check('the agent warning goes away once it reports', !(await ad.isVisible('[data-testid=agent-offline]')));
await ad.screenshot({ path: `${out}03-secure.png`, fullPage: true });

// ---------- SEO check ----------
await card.locator('button:has-text("SEO check")').click();
await card.locator('[data-testid=seo-check] li').first().waitFor();
check(
  'the SEO check gives a score and the list of fixes',
  /\d+/.test(await card.locator('[data-testid=seo-check] span').first().textContent()),
);

// ---------- Open the other site's admin with a one-time link ----------
const [tab] = await Promise.all([ctx.waitForEvent('page'), card.locator('button:has-text("Open admin")').click()]);
// 401: the made-up link below; 404: this site's admin after the site is deleted at the end.
watch(tab, /status of 40[14]/);
await tab.waitForURL(`${siteUrl}/admin`, { timeout: 15_000 });
check('Open admin signs the owner in to that site', (await tab.textContent('header')).includes('Corner Shop'));
check('its admin shows its own pages', await tab.isVisible('text=Home'));
await tab.goto(`${siteUrl}/admin/sso#ticket=not-a-real-ticket-but-long-enough`);
check(
  'a bad link is refused',
  await tab.waitForSelector('text=This link has expired').then(
    () => true,
    () => false,
  ),
);
await tab.screenshot({ path: `${out}04-other-admin.png` });

// ---------- Clean up ----------
ad.once('dialog', (d) => d.accept(domain));
await card.locator('button[title="Delete site"]').click();
await card.waitFor({ state: 'detached' });
check('deleting needs the address typed again, then the site is gone', !(await ad.isVisible(`article[data-site="${domain}"]`)));

await browser.close();
finish();
