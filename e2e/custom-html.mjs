// Custom HTML tags for the whole site (Site settings): written into every page, owners only.
import { adminLogin, api, API, apiToken, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('custom-html');
const browser = await launch();
const token = await apiToken();
const before = await api(token, 'GET', '/admin/settings');

// ---------- Site settings: the owner adds tags ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
await ad.fill(
  '[data-testid=head-html]',
  '<meta name="custom-verification" content="abc123">\n<script>window.customHead = (window.customHead || 0) + 1;</script>',
);
await ad.fill(
  '[data-testid=body-html]',
  '<div id="custom-body-tag">Chat</div>\n<script>window.customBody = !!document.getElementById("custom-body-tag");</script>',
);
await ad.locator('[data-testid=body-html]').scrollIntoViewIfNeeded();
await ad.screenshot({ path: out + 'settings.png' });
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');
const saved = await api(token, 'GET', '/admin/settings');
check('settings: the head tags are stored as written', saved.headHtml.includes('<meta name="custom-verification" content="abc123">'));
check('settings: the body tags are stored as written', saved.bodyHtml.startsWith('<div id="custom-body-tag">'));

// ---------- Public site ----------
const pub = await browser.newPage({ viewport: { width: 1280, height: 800 } });
watch(pub);
const res = await pub.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
const csp = (await res.headers())['content-security-policy'] ?? '';
check('site: the meta tag is in the head', (await pub.locator('head meta[name=custom-verification]').getAttribute('content')) === 'abc123');
check('site: the head script ran once', (await pub.evaluate(() => window.customHead)) === 1);
check('site: the body tags are at the end of the body', (await pub.locator('body > #custom-body-tag').count()) === 1);
check('site: the body script ran after them', (await pub.evaluate(() => window.customBody)) === true);
check("csp: scripts may load more scripts ('strict-dynamic')", /script-src [^;]*'strict-dynamic'/.test(csp), csp);
check('csp: requests may go to other HTTPS addresses', /connect-src 'self' https:/.test(csp), csp);

// Moving to another page keeps the tags without running them again.
const link = pub.locator('header a[href^="/en/"]').first();
if (await link.count()) {
  await link.click();
  await pub.waitForLoadState('networkidle');
  check('site: the tags stay on the next page without running again', (await pub.evaluate(() => window.customHead)) === 1);
}

// ---------- Admins who are not the owner cannot change them ----------
const email = `html-admin-${Date.now()}@example.com`;
const invited = await api(token, 'POST', '/admin/users', { email, name: 'HTML admin', role: 'admin' });
const secret = new URL(invited.link).searchParams.get('token');
await fetch(`${API}/auth/reset`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ token: secret, password: 'another-good-password' }),
});
const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
  body: JSON.stringify({ email, password: 'another-good-password' }),
});
const adminToken = (await login.json()).token;
const refused = await fetch(`${API}/admin/settings`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ headHtml: '<script>steal()</script>' }),
});
check('admins: changing the custom HTML is refused', refused.status === 403, String(refused.status));
const allowed = await fetch(`${API}/admin/settings`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ customCss: '' }),
});
check('admins: other settings still save', allowed.ok, String(allowed.status));
check('admins: the custom HTML is unchanged', (await api(token, 'GET', '/admin/settings')).headHtml === saved.headHtml);

// ---------- Without custom HTML the page keeps the strict policy ----------
await api(token, 'PUT', '/admin/settings', { headHtml: before.headHtml ?? '', bodyHtml: before.bodyHtml ?? '' });
const plain = await (await browser.newPage()).goto(`${BASE}/en`, { waitUntil: 'networkidle' });
const plainCsp = (await plain.headers())['content-security-policy'] ?? '';
check('csp: no custom HTML, no strict-dynamic', !plainCsp.includes('strict-dynamic') && /connect-src 'self';/.test(plainCsp), plainCsp);

await browser.close();
finish();
