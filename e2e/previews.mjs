// Preview sites in the browser: the owner makes one in Admin → Sites, a visitor sees it at /preview/<name> with its
// banner and every link and request kept under that path, the prospect sets a password from the invitation and
// edits it in its own admin, the owner's session on the main site is left alone, and an ended preview shows a
// notice. Needs the API started with PREVIEW_URL=<BASE_URL> (e2e/proxy.mjs plays nginx's part).
import { BASE, adminLogin, api, apiToken, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('previews');
const slug = `ali-${Date.now().toString(36)}`;
const prefix = `/preview/${slug}`;
const token = await apiToken();
const browser = await launch();
let previewId = '';

/** Same-site requests a page made outside the preview's path (built files and uploads are shared). */
function escapes(page) {
  const bad = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.origin === new URL(BASE).origin && !u.pathname.startsWith(`${prefix}/`) && !/^\/(_nuxt|uploads)\//.test(u.pathname))
      bad.push(u.pathname);
  });
  return bad;
}

try {
  // ---------- The owner makes it ----------
  const owner = watch(await browser.newPage({ viewport: { width: 1280, height: 900 } }));
  await adminLogin(owner);
  await owner.goto(`${BASE}/admin/sites`, { waitUntil: 'networkidle' });
  await owner.click('[data-testid=new-preview]');
  await owner.fill('#preview-name', 'Ali shop');
  await owner.fill('#preview-slug', slug);
  await owner.getByText('Developer portfolio', { exact: false }).first().click();
  await owner.fill('#preview-admin', `${slug}@example.com`);
  await owner.click('[data-testid=add-preview] button[type=submit]');
  await owner.waitForSelector('[data-testid=preview-invite]');
  const invite = await owner.inputValue('[data-testid=preview-invite]');
  check('the owner gets an invitation inside the preview', invite.startsWith(`${BASE}${prefix}/admin/reset?token=`), invite);
  await owner.waitForSelector(`[data-preview="${slug}"]`);
  check('the preview is listed with its days left', /14 days left/.test(await owner.textContent(`[data-preview="${slug}"]`)));
  previewId = (await api(token, 'GET', '/admin/sites')).sites.find((s) => s.previewSlug === slug)?.id ?? '';
  await owner.screenshot({ path: `${out}admin-sites.png`, fullPage: true });

  // ---------- A visitor ----------
  const visitor = watch(await browser.newPage({ viewport: { width: 1280, height: 900 } }), /status of 410/);
  const visitorEscapes = escapes(visitor);
  const res = await visitor.goto(`${BASE}${prefix}/`, { waitUntil: 'networkidle' });
  check('the root sends visitors to a language under the preview', new URL(visitor.url()).pathname.startsWith(`${prefix}/`), visitor.url());
  check(
    'it is never indexed',
    res.headers()['x-robots-tag']?.includes('noindex') || (await visitor.getAttribute('meta[name=robots]', 'content'))?.includes('noindex'),
  );
  check('the banner says it is a preview', (await visitor.locator('[data-preview-banner]').count()) === 1);
  const canonical = await visitor.getAttribute('link[rel=canonical]', 'href');
  check('canonical address keeps the path', canonical?.startsWith(`${BASE}${prefix}/`), canonical);
  const hrefs = await visitor.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')));
  const outside = hrefs.filter((h) => !h.startsWith(`${prefix}/`) && !h.startsWith('/uploads/'));
  check('every link on the page stays in the preview', hrefs.length > 0 && outside.length === 0, outside.join(' '));
  await visitor.screenshot({ path: `${out}visitor.png` });

  const other = visitor.locator(`a[href^="${prefix}/"]:not([href$="#"])`).last();
  if (await other.count()) {
    await Promise.all([visitor.waitForLoadState('networkidle'), other.click()]);
    check('following a link stays in the preview', new URL(visitor.url()).pathname.startsWith(prefix), visitor.url());
  }
  // A link typed into content without the path (e.g. in rich text) is corrected when clicked.
  await visitor.evaluate(() => {
    const a = document.createElement('a');
    a.href = '/en';
    a.id = 'typed-link';
    a.textContent = 'typed';
    document.body.prepend(a);
  });
  await Promise.all([visitor.waitForURL(`**${prefix}/en`), visitor.click('#typed-link')]);
  check('a link typed without the path is kept in the preview', new URL(visitor.url()).pathname === `${prefix}/en`, visitor.url());
  check('no request left the preview', visitorEscapes.length === 0, visitorEscapes.join(' '));

  // ---------- The prospect ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const prospect = watch(await ctx.newPage(), /401|403/);
  const prospectEscapes = escapes(prospect);
  await prospect.goto(invite, { waitUntil: 'networkidle' });
  await prospect.fill('#pw', 'prospect-pass-1');
  await prospect.fill('#pw2', 'prospect-pass-1');
  await prospect.click('button[type=submit]');
  await prospect.waitForTimeout(800);
  await prospect.goto(`${BASE}${prefix}/admin/login`, { waitUntil: 'networkidle' });
  await prospect.fill('input[type=email]', `${slug}@example.com`);
  await prospect.fill('input[type=password]', 'prospect-pass-1');
  await prospect.click('button[type=submit]');
  await prospect.waitForURL(`${BASE}${prefix}/admin`);
  check('the prospect signs in to the preview’s admin', true);
  await prospect.waitForSelector('[data-preview-banner]');
  check('the admin shows the preview banner', (await prospect.locator('[data-preview-banner]').count()) === 1);
  const cookies = await ctx.cookies();
  check(
    'their session cookie belongs to the preview’s path',
    cookies.some((c) => c.name === 'pt_session' && c.path === prefix),
    JSON.stringify(cookies.map((c) => [c.name, c.path])),
  );
  await prospect.waitForSelector('main a[href*="/admin/pages/"]');
  check('their dashboard lists the template’s pages', (await prospect.locator('main a[href*="/admin/pages/"]').count()) >= 3);
  const navHrefs = await prospect.$$eval('nav a', (as) => as.map((a) => a.getAttribute('href')));
  check(
    'the admin’s links stay in the preview',
    navHrefs.length > 0 && navHrefs.every((h) => h.startsWith(`${prefix}/admin`)),
    navHrefs.join(' '),
  );
  await Promise.all([
    prospect.waitForURL(`**${prefix}/admin/settings`, { waitUntil: 'commit' }),
    prospect.click('nav a[href$="/admin/settings"]'),
  ]);
  await prospect.waitForLoadState('networkidle');
  const heading = await prospect
    .locator('h1', { hasText: 'Site settings' })
    .waitFor({ timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  check('they can open the site settings', heading);
  await prospect.screenshot({ path: `${out}prospect-admin.png` });
  check('the admin made no request outside the preview', prospectEscapes.length === 0, prospectEscapes.join(' '));

  // ---------- The owner's own session is untouched ----------
  const me = await owner.evaluate(async () => {
    const csrf = decodeURIComponent(document.cookie.match(/(?:^|; )pt_csrf=([^;]*)/)?.[1] ?? '');
    return (await fetch('/api/auth/me', { headers: { 'x-csrf-token': csrf } })).json();
  });
  check('the owner is still signed in to the main site', me.role === 'owner' && !me.site?.preview, JSON.stringify(me).slice(0, 200));

  // ---------- Ended ----------
  await api(token, 'PATCH', `/admin/sites/${previewId}/preview`, { expiresAt: new Date(Date.now() - 1000).toISOString() });
  const ended = await visitor.goto(`${BASE}${prefix}/en`, { waitUntil: 'networkidle' });
  check(
    'an ended preview answers 410 with a notice',
    ended.status() === 410 && /preview has ended/i.test(await visitor.textContent('body')),
  );
  await visitor.screenshot({ path: `${out}ended.png` });
} finally {
  if (previewId) await api(token, 'DELETE', `/admin/sites/${previewId}`, { confirm: slug }).catch(() => undefined);
  await browser.close();
  finish();
}
