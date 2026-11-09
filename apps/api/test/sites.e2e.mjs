// Several sites in one installation: each site's content stays its own, the owner manages them all, and the
// domains agent's routes. Run against a running API, like api.e2e.mjs (INTERNAL_TOKEN must match the API's).
// Sites are picked by address; the tests send it as X-Forwarded-Host, as nginx does.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const INTERNAL = process.env.INTERNAL_TOKEN ?? 'agent-secret';
const run = Date.now().toString(36);
const A = `a-${run}.test`;
const B = `b-${run}.test`;
let owner = '';
const ids = {};

async function call(method, path, { host = 'localhost', body, token = owner, headers = {}, ip } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'x-forwarded-host': host,
      ...(ip ? { 'x-forwarded-for': ip } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

async function publishPage(host, name, slug, text) {
  const blocks = [{ id: 't1', type: 'rich-text', props: { html: `<p>${text}</p>` } }];
  const page = await call('POST', '/admin/pages', {
    host,
    body: { name, translations: [{ locale: 'en', title: name, slug, blocks }] },
  });
  assert.equal(page.status, 201, JSON.stringify(page.body));
  assert.equal((await call('POST', `/admin/pages/${page.body.id}/publish`, { host })).status, 200);
  return page.body;
}

before(async () => {
  const res = await call('POST', '/auth/login', { body: ADMIN, token: '', ip: '198.51.100.40' });
  assert.equal(res.status, 200, 'owner login');
  assert.equal(res.body.user.role, 'owner', 'the first admin is the owner');
  owner = res.body.token;
});

after(async () => {
  for (const [id, domain] of [
    [ids.a, A],
    [ids.b, B],
  ]) {
    if (id) await call('DELETE', `/admin/sites/${id}`, { body: { confirm: domain } });
  }
});

describe('adding sites', () => {
  test('the owner adds sites by address; bad and taken addresses are refused', async () => {
    assert.equal((await call('POST', '/admin/sites', { body: { domain: 'not a domain' } })).status, 400);
    assert.equal((await call('POST', '/admin/sites', { body: { domain: 'localhost' } })).status, 409, 'used by the first site');

    const a = await call('POST', '/admin/sites', {
      body: { name: 'Site A', domain: `https://${A.toUpperCase()}/`, aliases: [`www.${A}`] },
    });
    assert.equal(a.status, 201, JSON.stringify(a.body));
    assert.equal(a.body.site.primary, A, 'addresses are normalized');
    assert.deepEqual(a.body.site.aliases, [`www.${A}`]);
    assert.equal(a.body.site.ssl, 'none', 'no certificate until the owner asks for one');
    ids.a = a.body.site.id;

    const b = await call('POST', '/admin/sites', {
      body: { name: 'Site B', domain: B, ssl: true, demo: false, adminEmail: `boss@${B}`, adminLang: 'fa', defaultLocale: 'en' },
    });
    assert.equal(b.status, 201, JSON.stringify(b.body));
    assert.equal(b.body.site.ssl, 'queued');
    assert.ok(b.body.invite.link.startsWith(`http://${B}/admin/reset?token=`), 'the invitation points at the new site');
    ids.b = b.body.site.id;
    ids.bInvite = b.body.invite.link;

    const list = (await call('GET', '/admin/sites')).body;
    assert.ok(list.sites.some((s) => s.id === ids.a) && list.sites.some((s) => s.id === ids.b));
    assert.equal(list.sites.find((s) => s.current).primary, 'localhost');
  });

  test('a new site starts with its own settings, and demo content only when asked', async () => {
    const a = await call('GET', '/public/settings', { host: A, token: '' });
    assert.equal(a.body.siteName.en, 'Site A');
    assert.equal(a.body.origin, `http://${A}`);
    assert.equal((await call('GET', '/public/en/page', { host: A, token: '' })).status, 200, 'A has the demo home page');
    assert.equal((await call('GET', '/public/en/page', { host: B, token: '' })).status, 404, 'B starts empty');
    assert.equal((await call('GET', '/admin/collections', { host: B })).body.length, 0);
    assert.ok((await call('GET', '/admin/collections', { host: A })).body.some((c) => c.key === 'projects'));
  });

  test("the owner picks each site's admin panel language; the admin reads it before signing in", async () => {
    assert.equal((await call('GET', '/public/settings', { host: A, token: '' })).body.adminLang, '', 'unset: the browser decides');
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.adminLang, 'fa');
    assert.equal((await call('POST', '/admin/sites', { body: { domain: `c-${run}.test`, adminLang: 'de' } })).status, 400);

    const changed = await call('PATCH', `/admin/sites/${ids.a}`, { body: { adminLang: 'en' } });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.adminLang, 'en');
    assert.equal((await call('GET', '/public/settings', { host: A, token: '' })).body.adminLang, 'en');
    assert.equal((await call('PATCH', `/admin/sites/${ids.a}`, { body: { adminLang: 'xx' } })).status, 400);
  });

  test("each site's language for visitors: set when adding it, changed in its settings", async () => {
    assert.equal((await call('GET', '/public/settings', { host: A, token: '' })).body.defaultLocale, '', 'unset: the browser decides');
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.defaultLocale, 'en');

    assert.equal((await call('PUT', '/admin/settings', { host: A, body: { defaultLocale: 'fa' } })).status, 200);
    assert.equal((await call('GET', '/public/settings', { host: A, token: '' })).body.defaultLocale, 'fa');
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.defaultLocale, 'en', 'other sites keep theirs');
    assert.equal(
      (await call('PUT', '/admin/settings', { host: A, body: { defaultLocale: 'de' } })).status,
      400,
      'only the site’s languages',
    );
    assert.equal((await call('POST', '/admin/sites', { body: { domain: `d-${run}.test`, defaultLocale: 'xx' } })).status, 400);
  });

  test('an alias is the same site', async () => {
    const www = await call('GET', '/public/settings', { host: `www.${A}`, token: '' });
    assert.equal(www.body.siteName.en, 'Site A');
    assert.equal(www.body.origin, `http://${A}`, 'links use the main address');
  });

  test('an address that belongs to no site gets 404 once there are several sites', async () => {
    const res = await call('GET', '/public/settings', { host: `nobody-${run}.test`, token: '' });
    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'No site at this address');
  });
});

describe('each site keeps its own content', () => {
  test('pages: the same address on two sites, each showing its own', async () => {
    await publishPage(A, 'About A', 'about', 'This is site A');
    await publishPage(B, 'About B', 'about', 'This is site B');
    const a = await call('GET', '/public/en/page?slug=about', { host: A, token: '' });
    const b = await call('GET', '/public/en/page?slug=about', { host: B, token: '' });
    assert.match(a.body.blocks[0].props.html, /site A/);
    assert.match(b.body.blocks[0].props.html, /site B/);
    assert.ok(!(await call('GET', '/admin/pages', { host: B })).body.some((p) => p.name === 'About A'));
    const aboutA = (await call('GET', '/admin/pages', { host: A })).body.find((p) => p.name === 'About A');
    assert.equal((await call('GET', `/admin/pages/${aboutA.id}`, { host: B })).status, 404, "another site's page by id");
    assert.equal((await call('DELETE', `/admin/pages/${aboutA.id}`, { host: B })).status, 404);
  });

  test('settings, redirects and the inbox', async () => {
    assert.equal((await call('PUT', '/admin/settings', { host: B, body: { siteName: { en: 'Bee', fa: 'بی' } } })).status, 200);
    assert.equal((await call('GET', '/public/settings', { host: A, token: '' })).body.siteName.en, 'Site A');

    assert.equal((await call('POST', '/admin/redirects', { host: A, body: { from: '/old-a', to: '/en' } })).status, 201);
    assert.equal((await call('GET', '/public/redirect?path=/old-a', { host: A, token: '' })).status, 200);
    assert.equal((await call('GET', '/public/redirect?path=/old-a', { host: B, token: '' })).status, 404);
    assert.equal((await call('POST', '/admin/redirects', { host: B, body: { from: '/old-a', to: '/en' } })).status, 201, 'same path on B');

    assert.equal((await call('GET', '/admin/submissions/unread-count', { host: B })).body.count, 0);
  });

  test('media', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'dot.png');
    const up = await fetch(`${API}/admin/media`, {
      method: 'POST',
      headers: { authorization: `Bearer ${owner}`, 'x-forwarded-host': A },
      body: form,
    });
    assert.equal(up.status, 201);
    const media = await up.json();
    assert.ok((await call('GET', '/admin/media', { host: A })).body.some((m) => m.id === media.id));
    assert.ok(!(await call('GET', '/admin/media', { host: B })).body.some((m) => m.id === media.id), 'not in B');
    assert.equal((await call('PATCH', `/admin/media/${media.id}`, { host: B, body: { folder: 'x' } })).status, 404);
  });

  test('the sitemap lists only the site’s own pages, and leaves out hidden ones', async () => {
    const hidden = await publishPage(A, 'Hidden A', 'hidden', 'secret');
    assert.equal((await call('PATCH', `/admin/pages/${hidden.id}`, { host: A, body: { noindex: true } })).status, 200);
    const groups = (await call('GET', '/public/sitemap', { host: A, token: '' })).body;
    const paths = groups.flatMap((g) => g.entries.flatMap((e) => e.paths.map((p) => p.path)));
    assert.ok(paths.includes('about'));
    assert.ok(!paths.includes('hidden'), 'noindex pages are left out');
    const bEntries = (await call('GET', '/public/sitemap', { host: B, token: '' })).body.flatMap((g) => g.entries);
    assert.equal(bEntries.length, 1, "B's sitemap has B's one page (in each language)");
    assert.ok(bEntries[0].paths.some((p) => p.locale === 'en' && p.path === 'about'));
    const page = await call('GET', '/public/en/page?slug=hidden', { host: A, token: '' });
    assert.equal(page.body.noindex, true, 'the page tells the site to add a noindex tag');
  });

  test('SEO settings are cleaned', async () => {
    const res = await call('PUT', '/admin/settings', {
      host: A,
      body: {
        seo: {
          titleTemplate: { en: '%s | A', fa: 'no placeholder' },
          verification: { google: 'abc-123"><script>' },
          robotsExtra: 'Disallow: /private\n<script>\nAllow: /private/ok',
          hideSite: true,
          twitter: '@site_a',
        },
      },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.seo.titleTemplate, { en: '%s | A' }, 'a pattern needs %s');
    assert.equal(res.body.seo.verification.google, 'abc-123script');
    assert.equal(res.body.seo.robotsExtra, 'Disallow: /private\nAllow: /private/ok');
    assert.equal(res.body.seo.twitter, 'site_a');
    const check = await call('GET', `/admin/sites/${ids.a}/seo-check`);
    assert.equal(check.status, 200);
    assert.ok(check.body.issues.some((i) => /hidden from search engines/.test(i.message)));
    assert.ok(check.body.urls > 0);
  });
});

describe('accounts', () => {
  test("a site's admin works on that site only; editors and admins cannot open Admin → Sites", async () => {
    const token = new URL(ids.bInvite).searchParams.get('token');
    assert.equal(
      (await call('POST', '/auth/reset', { host: A, token: '', body: { token, password: 'b-admin-pass-1' } })).status,
      400,
      'link of another site',
    );
    assert.equal((await call('POST', '/auth/reset', { host: B, token: '', body: { token, password: 'b-admin-pass-1' } })).status, 204);

    const login = (host) =>
      call('POST', '/auth/login', { host, token: '', ip: '198.51.100.41', body: { email: `boss@${B}`, password: 'b-admin-pass-1' } });
    assert.equal((await login(A)).status, 401, "B's admin has no account on A");
    const res = await login(B);
    assert.equal(res.status, 200);
    const bAdmin = res.body.token;
    ids.bAdmin = bAdmin;
    assert.equal((await call('GET', '/admin/pages', { host: B, token: bAdmin })).status, 200);
    assert.equal((await call('GET', '/admin/pages', { host: A, token: bAdmin })).status, 401, "B's session is refused on A");
    assert.equal((await call('GET', '/admin/sites', { host: B, token: bAdmin })).status, 403);
    assert.ok(
      !(await call('GET', '/admin/users', { host: B, token: bAdmin })).body.some((u) => u.role === 'owner'),
      'owners are not site users',
    );
  });

  test('one-time sign-in links: right site, once', async () => {
    const open = await call('POST', `/admin/sites/${ids.b}/open`);
    assert.equal(open.status, 200);
    assert.ok(open.body.url.startsWith(`http://${B}/admin/sso#ticket=`));
    const ticket = open.body.url.split('#ticket=')[1];
    const sso = (host) => call('POST', '/auth/sso', { host, token: '', ip: '198.51.100.42', body: { ticket } });
    assert.equal((await call('GET', '/auth/me', { host: B, token: ticket })).status, 401, 'a link is not a session');
    assert.equal((await sso(A)).status, 401, 'made for B');
    const ok = await sso(B);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('set-cookie') ?? '', /pt_session=/);
    assert.equal((await sso(B)).status, 401, 'only once');
  });
});

describe('SEO, sitemap and robots.txt (Admin → SEO)', () => {
  test("a site's admin manages its sitemap and robots.txt", async () => {
    const bAdmin = ids.bAdmin;
    assert.equal((await call('GET', '/auth/me', { host: B, token: bAdmin })).body.site.seoAllowed, true, 'allowed by default');
    const view = await call('GET', '/admin/seo', { host: B, token: bAdmin });
    assert.equal(view.status, 200, JSON.stringify(view.body));
    assert.equal(view.body.sitemap.url, `http://${B}/sitemap.xml`);
    assert.ok(view.body.sitemap.groups.some((g) => g.urls.includes(`http://${B}/en/about`)));
    assert.match(view.body.robots, /Disallow: \/admin/);

    const saved = await call('PUT', '/admin/seo', {
      host: B,
      token: bAdmin,
      body: {
        seo: {
          sitemapExclude: ['/en/about/', 'not a path'],
          sitemapExtra: ['/landing', `https://elsewhere.test/promo`, '/en/about/team'],
          robotsMode: 'custom',
          robotsCustom: 'User-agent: *\nDisallow: /tmp\n<script>',
        },
      },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.seo.sitemapExclude, ['/en/about']);
    assert.deepEqual(saved.body.seo.sitemapExtra, ['/landing', '/promo', '/en/about/team'], 'only paths on the site');
    assert.equal(saved.body.robots, `User-agent: *\nDisallow: /tmp\n\nSitemap: http://${B}/sitemap.xml\n`);
    const urls = saved.body.sitemap.groups.flatMap((g) => g.urls);
    assert.ok(!urls.some((u) => u.includes('/en/about')), 'excluded, with everything under it');
    assert.deepEqual(saved.body.sitemap.groups.find((g) => g.group === '_extra').urls, [`http://${B}/landing`, `http://${B}/promo`]);

    const groups = (await call('GET', '/public/sitemap', { host: B, token: '' })).body;
    const paths = groups.flatMap((g) => g.entries.flatMap((e) => e.paths));
    assert.ok(!paths.some((p) => p.path === 'about'));
    assert.ok(
      paths.some((p) => p.locale === '' && p.path === '/landing'),
      'the renderer gets the added addresses',
    );
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.seo.robotsMode, 'custom');
  });

  test('the owner can keep a site’s SEO to the owners', async () => {
    const bAdmin = ids.bAdmin;
    const off = await call('PATCH', `/admin/sites/${ids.b}`, { body: { seoAllowed: false } });
    assert.equal(off.status, 200);
    assert.equal(off.body.seoAllowed, false);
    assert.equal((await call('GET', '/auth/me', { host: B, token: bAdmin })).body.site.seoAllowed, false);
    assert.equal((await call('GET', '/admin/seo', { host: B, token: bAdmin })).status, 403);
    assert.equal((await call('PUT', '/admin/seo', { host: B, token: bAdmin, body: { seo: { hideSite: true } } })).status, 403);
    assert.equal((await call('PUT', '/admin/settings', { host: B, token: bAdmin, body: { seo: { hideSite: true } } })).status, 403);
    assert.equal(
      (await call('PUT', '/admin/settings', { host: B, token: bAdmin, body: { notifyEmail: '' } })).status,
      200,
      'the other settings stay theirs',
    );
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.seo.robotsMode, 'custom', 'nothing is reset');

    const asOwner = await call('PUT', '/admin/seo', { host: B, body: { seo: { robotsMode: 'auto' } } });
    assert.equal(asOwner.status, 200, 'owners still can');
    assert.match(asOwner.body.robots, /Disallow: \/admin/);

    assert.equal((await call('PATCH', `/admin/sites/${ids.b}`, { body: { seoAllowed: true } })).body.seoAllowed, true);
    assert.equal((await call('GET', '/admin/seo', { host: B, token: bAdmin })).status, 200, 'allowed again');
  });
});

describe('components: which sites may use each block (Admin → Components)', () => {
  test('the owner keeps a block to chosen sites; the others cannot add it, pages that had it keep it', async () => {
    const page = await publishPage(B, 'Prices', 'prices', 'Plans');
    const withPricing = (id) => [{ id, type: 'pricing', props: {} }];
    // A page on B that already has the FAQ before the owner restricts it.
    const faq = await call('POST', `/admin/pages/${page.id}/blocks`, {
      host: B,
      body: { locale: 'en', position: 'end', blocks: [{ id: 'f1', type: 'faq', props: {} }] },
    });
    assert.equal(faq.status, 200, JSON.stringify(faq.body));

    const set = await call('PUT', '/admin/block-access', {
      body: {
        changes: [
          { type: 'pricing', siteIds: [ids.a] },
          { type: 'faq', siteIds: [] },
        ],
      },
    });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.deepEqual(set.body.rules.pricing, [ids.a]);
    assert.equal(set.body.usage[ids.b].faq, 1, 'usage counts the pages using it');

    const schema = (host) => call('GET', '/admin/pages/schema', { host }).then((r) => r.body.hidden);
    assert.ok(!(await schema(A)).includes('pricing'), 'A is allowed the pricing table');
    assert.ok((await schema(B)).includes('pricing'), "B's editor leaves it out");
    assert.ok((await schema(A)).includes('faq') && (await schema(B)).includes('faq'));

    const add = (host, id) =>
      call('POST', `/admin/pages/${id}/blocks`, { host, body: { locale: 'en', position: 'end', blocks: withPricing('p1') } });
    assert.equal((await add(B, page.id)).status, 400, 'B cannot add it');
    const created = await call('POST', '/admin/pages', {
      host: B,
      body: { name: 'New', translations: [{ locale: 'en', title: 'New', slug: 'new-prices', blocks: withPricing('p2') }] },
    });
    assert.equal(created.status, 400, 'nor make a page with it');

    // The page that already had the FAQ can still be saved, and still shows it.
    const current = (await call('GET', `/admin/pages/${page.id}`, { host: B })).body;
    const translations = current.translations.map(({ locale, title, slug, blocks }) => ({ locale, title, slug, blocks }));
    assert.equal((await call('PATCH', `/admin/pages/${page.id}`, { host: B, body: { translations } })).status, 200);
    assert.equal((await call('POST', `/admin/pages/${page.id}/publish`, { host: B })).status, 200);
    const live = await call('GET', '/public/en/page?slug=prices', { host: B, token: '' });
    assert.ok(live.body.blocks.some((b) => b.type === 'faq'));

    assert.equal((await call('PUT', '/admin/block-access', { body: { changes: [{ type: 'nope', siteIds: null }] } })).status, 400);
    assert.equal(
      (await call('PUT', '/admin/block-access', { host: B, token: ids.bAdmin, body: { changes: [{ type: 'faq', siteIds: null }] } }))
        .status,
      403,
      "a site's admin cannot change it",
    );

    const reset = await call('PUT', '/admin/block-access', {
      body: {
        changes: [
          { type: 'pricing', siteIds: null },
          { type: 'faq', siteIds: null },
        ],
      },
    });
    assert.deepEqual(reset.body.rules, {});
    assert.equal((await add(B, page.id)).status, 200, 'back on every site');
  });
});

describe('certificates and the domains agent', () => {
  const agent = (method, path, body, token = INTERNAL) =>
    call(method, `/internal${path}`, { token: '', host: 'api', body, headers: token ? { 'x-internal-token': token } : {} });

  test('the agent routes need the token', async () => {
    assert.equal((await agent('GET', '/sites', undefined, '')).status, 404);
    assert.equal((await agent('GET', '/sites', undefined, 'wrong')).status, 404);
  });

  test('the agent sees what the owner asked for, reports each step, and the site becomes https', async () => {
    const list = (await agent('GET', '/sites')).body;
    assert.equal(list.find((s) => s.id === ids.a).due, false, 'A: no certificate asked for');
    assert.equal(list.find((s) => s.id === ids.b).due, true, 'B: asked for when it was added');

    assert.equal((await agent('POST', '/heartbeat', { serverIp: '203.0.113.9', version: 'test' })).status, 200);
    assert.equal((await agent('POST', `/sites/${ids.b}/events`, { step: 'dns', state: 'running', message: 'Checking DNS' })).status, 200);
    assert.equal((await call('GET', `/admin/sites/${ids.b}`)).body.ssl, 'running');
    await agent('POST', `/sites/${ids.b}/events`, { step: 'dns', state: 'failed', message: `${B} points nowhere` });
    await agent('POST', `/sites/${ids.b}/ssl`, { ok: false, message: `${B} points nowhere` });
    const failed = (await call('GET', `/admin/sites/${ids.b}`)).body;
    assert.equal(failed.ssl, 'failed');
    assert.ok(failed.sslRetryAt, 'retried later by itself');
    assert.equal((await agent('GET', '/sites')).body.find((s) => s.id === ids.b).due, false, 'not before the wait');

    assert.equal((await call('POST', `/admin/sites/${ids.b}/ssl`)).status, 200, 'the owner retries now');
    assert.equal((await agent('GET', '/sites')).body.find((s) => s.id === ids.b).due, true);
    await agent('POST', `/sites/${ids.b}/ssl`, { ok: true, message: 'Secure', expires: '2027-01-01T00:00:00.000Z' });
    const done = (await call('GET', `/admin/sites/${ids.b}`)).body;
    assert.equal(done.ssl, 'active');
    assert.equal(done.url, `https://${B}`);
    assert.equal((await call('GET', '/public/settings', { host: B, token: '' })).body.origin, `https://${B}`);

    await agent('POST', '/heartbeat', { certificates: [{ name: B, expires: '2027-03-01T00:00:00.000Z' }] });
    const events = (await call('GET', `/admin/sites/${ids.b}/ssl-events`)).body;
    assert.ok(
      events.some((e) => e.step === 'renewed'),
      'a later expiry date is recorded as a renewal',
    );
    assert.deepEqual(
      events
        .map((e) => e.step)
        .reverse()
        .slice(0, 3),
      ['queued', 'dns', 'dns'],
      'the timeline starts with the request and the DNS check',
    );
    assert.equal((await call('GET', '/admin/sites')).body.agent.serverIp, '203.0.113.9');
  });

  test('turning SSL off', async () => {
    const off = await call('DELETE', `/admin/sites/${ids.b}/ssl`);
    assert.equal(off.body.ssl, 'none');
    assert.equal(off.body.url, `http://${B}`);
  });
});

describe('deleting a site', () => {
  test('needs the address typed again, and never the site you are on', async () => {
    assert.equal((await call('DELETE', `/admin/sites/${ids.b}`, { body: { confirm: 'nope' } })).status, 400);
    const current = (await call('GET', '/admin/sites')).body.sites.find((s) => s.current);
    assert.equal((await call('DELETE', `/admin/sites/${current.id}`, { body: { confirm: current.primary } })).status, 400);
    assert.equal((await call('DELETE', `/admin/sites/${ids.b}`, { body: { confirm: B } })).status, 204);
    assert.equal((await call('GET', '/public/en/page?slug=about', { host: B, token: '' })).status, 404, 'its pages are gone');
    ids.b = undefined;
  });
});
