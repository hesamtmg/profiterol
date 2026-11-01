// Previews made by a site's own admins, in the browser: the owner allows it in Admin → Sites with limits, the site's
// admin gets "Preview sites" in their menu, makes one under the site's own address, sends its admin panel to someone,
// and asks for a bought one to be moved; the owner sees it with who made it. The site uses a *.localhost address,
// which browsers send to this machine.
import { BASE, adminLogin, api, apiToken, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('site-previews');
const port = new URL(BASE).port || '80';
const run = Date.now().toString(36);
const domain = `agency-${run}.localhost`;
const agencyUrl = `http://${domain}:${port}`;
const slug = `cafe-${run}`;
const token = await apiToken();
const browser = await launch();
let siteId = '';

/** The API as the agency site sees it: straight to the API, with the site's address, as nginx sends it. */
const DIRECT = process.env.API_DIRECT_URL ?? 'http://localhost:3001/api';
async function asAgency(method, path, body) {
  const res = await fetch(`${DIRECT}${path}`, {
    method,
    headers: { 'x-forwarded-host': domain, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

try {
  // ---------- A site with its own admin ----------
  const site = await api(token, 'POST', '/admin/sites', { name: 'Nima Studio', domain, demo: false, adminEmail: `nima@${run}.test` });
  siteId = site.site.id;
  await asAgency('POST', '/auth/reset', { token: new URL(site.invite.link).searchParams.get('token'), password: 'nima-studio-1' });

  // ---------- The owner allows previews there ----------
  const owner = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
  await adminLogin(owner);
  await owner.goto(`${BASE}/admin/sites`, { waitUntil: 'networkidle' });
  const card = owner.locator(`[data-site="${domain}"]`);
  await card.locator('button[title*="Edit"]').click();
  await card.locator('[data-testid=edit-previews-allowed]').check();
  await card.locator(`#pmax-${siteId}`).fill('3');
  await card.locator(`#pdays-${siteId}`).fill('21');
  await card.locator('[data-testid=edit-previews]').screenshot({ path: `${out}01-owner-allows-previews.png` });
  await card.locator('form button[type=submit]').click();
  await owner.waitForSelector(`[data-site="${domain}"] [data-testid=site-previews-allowed]`);
  check('the owner allows previews with limits', /0 of 3 online, up to 21 days/.test(await card.textContent()));
  await card.screenshot({ path: `${out}02-site-card-with-previews.png` });

  // ---------- The site's admin ----------
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const nima = watch(await ctx.newPage());
  await nima.goto(`${agencyUrl}/admin/login`, { waitUntil: 'networkidle' });
  await nima.fill('input[type=email]', `nima@${run}.test`);
  await nima.fill('input[type=password]', 'nima-studio-1');
  await nima.click('button[type=submit]');
  await nima.waitForURL(`${agencyUrl}/admin`);
  await nima.waitForSelector('nav a[href="/admin/previews"]');
  check('the site’s admin gets Preview sites in the menu', true);
  await nima.click('nav a[href="/admin/previews"]');
  await nima.waitForSelector('[data-testid=preview-limits]');
  check('they see their limits', /0 of 3 online · each for up to 21 days/.test(await nima.textContent('[data-testid=preview-limits]')));
  await nima.click('[data-testid=new-preview]');
  await nima.fill('#preview-name', 'Cafe Sol');
  await nima.fill('#preview-slug', slug);
  await nima
    .getByText('Atelier', { exact: false })
    .first()
    .click()
    .catch(() => nima.getByText('Studio').first().click());
  await nima.fill('#preview-days', '14');
  await nima.fill('#preview-notes', 'Sara, cafe owner. Wants online menu.');
  check(
    'the address is on their own site',
    (await nima.textContent('[data-testid=add-preview]')).includes(`${domain}:${port}/preview/`) ||
      (await nima.textContent('[data-testid=add-preview]')).includes(`${domain}/preview/`),
  );
  await nima.screenshot({ path: `${out}03-site-admin-new-preview.png`, fullPage: true });
  await nima.click('[data-testid=add-preview] button[type=submit]');
  await nima.waitForSelector(`[data-preview="${slug}"]`);
  check('the preview is listed', /1 of 3 online/.test(await nima.textContent('[data-testid=preview-limits]')));

  const pcard = nima.locator(`[data-preview="${slug}"]`);
  await pcard.locator('[data-testid=send-access]').click();
  await pcard.locator('[data-testid=access-email]').fill(`sara@${run}.test`);
  await pcard.locator('form button[type=submit]').click();
  await pcard.locator('[data-testid=access-link]').waitFor();
  const access = await pcard.locator('[data-testid=access-link]').inputValue();
  check('they send the preview’s admin panel to anyone', access.includes(`/preview/${slug}/admin/reset?token=`), access);
  await pcard.screenshot({ path: `${out}04-send-admin-access.png` });

  await pcard.locator('[data-testid=convert-preview]').click();
  await pcard.locator('[data-testid=convert-domain]').fill('cafesol.ir');
  await pcard.locator('form button[type=submit]').click();
  await pcard.locator('[data-testid=convert-request]').waitFor();
  check(
    'they ask for a bought one to be moved',
    (await pcard.locator('[data-testid=convert-request]').textContent()).includes('cafesol.ir'),
  );
  await pcard.screenshot({ path: `${out}05-site-admin-preview-card.png` });

  // ---------- Sara opens her preview's admin from the link ----------
  const sara = watch(await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage(), /401|403/);
  await sara.goto(access, { waitUntil: 'networkidle' });
  await sara.fill('#pw', 'sara-cafe-2026');
  await sara.fill('#pw2', 'sara-cafe-2026');
  await sara.click('button[type=submit]');
  await sara.waitForTimeout(800);
  await sara.goto(`${agencyUrl}/preview/${slug}/admin/login`, { waitUntil: 'networkidle' });
  await sara.fill('input[type=email]', `sara@${run}.test`);
  await sara.fill('input[type=password]', 'sara-cafe-2026');
  await sara.click('button[type=submit]');
  await sara.waitForURL(`${agencyUrl}/preview/${slug}/admin`);
  check('the person signs in to the preview’s admin', true);
  check('without the agency’s Preview sites menu', (await sara.locator('nav a[href$="/admin/previews"]').count()) === 0);

  // ---------- The public preview, on the agency's address ----------
  const visitor = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
  await visitor.goto(`${agencyUrl}/preview/${slug}/en`, { waitUntil: 'networkidle' });
  await visitor.waitForTimeout(2000);
  const keep = await visitor.getAttribute('[data-preview-banner] a', 'href');
  check('"Keep this site" leads to the agency', keep?.startsWith(`http://${domain}`), keep);
  await visitor.screenshot({ path: `${out}06-preview-on-agency-address.png` });

  // ---------- The owner sees it, with who made it ----------
  await owner.reload({ waitUntil: 'networkidle' });
  const ocard = owner.locator(`[data-preview="${slug}"]`);
  check('the owner sees who made it', (await ocard.locator('[data-testid=preview-host]').textContent()).includes('Nima Studio'));
  await ocard.locator('[data-testid=convert-preview]').click();
  check(
    'and the request fills in the address',
    (await ocard
      .locator(`#convert-${(await api(token, 'GET', '/admin/sites')).sites.find((s) => s.previewSlug === slug).id}`)
      .inputValue()) === 'cafesol.ir',
  );
  await ocard.screenshot({ path: `${out}07-owner-sees-request.png` });
} finally {
  if (siteId) await api(token, 'DELETE', `/admin/sites/${siteId}`, { confirm: domain }).catch(() => undefined);
  await browser.close();
  finish();
}
