// Sign-in cookies, the Content-Security-Policy, and managing users: invite, choose a password, roles, deactivate.
import { ADMIN, BASE, adminLogin, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('security');
const browser = await launch();

// ---------- CSP: no page breaks under it ----------
const violations = [];
const csp = (p) => p.on('console', (m) => /Content Security Policy|Refused to (load|execute|apply|frame)/i.test(m.text()) && violations.push(`${p.url()}: ${m.text().slice(0, 160)}`));
const site = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }), /openstreetmap|youtube|429/);
csp(site);
for (const path of ['/en', '/fa', '/en/amsr', '/en/classic', '/en/motion', '/en/extras', '/en/contact']) {
  const res = await site.goto(BASE + path, { waitUntil: 'networkidle' });
  if (path === '/en') check('pages send a Content-Security-Policy with a nonce', /script-src 'self' 'nonce-/.test(res.headers()['content-security-policy'] ?? ''));
  await site.mouse.wheel(0, 3000);
  await site.waitForTimeout(400);
}

// ---------- The admin's session ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// 403, 404 and 401 are this suite's own checks (no CSRF header, a missing page, signed out).
const ad = watch(await ctx.newPage(), /status of 40[134]/);
csp(ad);
await adminLogin(ad);
const cookies = await ctx.cookies();
check('session cookie is httpOnly', cookies.some((c) => c.name === 'pt_session' && c.httpOnly));
check('scripts cannot read the session', !(await ad.evaluate(() => document.cookie)).includes('pt_session'));
const status = (headers) =>
  ad.evaluate(async (h) => (await fetch('/api/admin/pages/00000000-0000-0000-0000-000000000000', { method: 'PATCH', headers: { 'content-type': 'application/json', ...h }, body: '{}' })).status, headers);
check('a change without the CSRF header is refused', (await status({})) === 403);
const csrf = await ad.evaluate(() => decodeURIComponent(document.cookie.match(/pt_csrf=([^;]*)/)[1]));
check('with the header it reaches the API (404 for a missing page)', (await status({ 'x-csrf-token': csrf })) === 404);

// ---------- Users: invite an editor ----------
await ad.click('nav a[href="/admin/users"]');
await ad.waitForSelector('text=Invite someone');
const email = `neda-${Date.now()}@example.com`;
await ad.click('button:has-text("Invite someone")');
await ad.fill('#inv-email', email);
await ad.fill('#inv-name', 'Neda');
await ad.click('button:has-text("Create account")');
await ad.waitForSelector('[role=status]:has-text("Account created")');
const link = await ad.inputValue('[role=status] input');
check('invitation link is shown', /\/admin\/reset\?token=/.test(link));
check('the new user is listed as invited', (await ad.locator(`tr[data-email="${email}"]:has-text("Invited")`).count()) === 1);
await ad.screenshot({ path: out + 'users.png' });

// The editor follows the link and chooses a password.
const ed = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const edPage = watch(await ed.newPage(), /status of 40[013]/);
csp(edPage);
await edPage.goto(link, { waitUntil: 'networkidle' });
await edPage.fill('#pw', 'neda-password-1');
await edPage.fill('#pw2', 'neda-password-2');
await edPage.click('button[type=submit]');
check('mismatched passwords are caught', (await edPage.locator('text=not the same').count()) === 1);
await edPage.fill('#pw2', 'neda-password-1');
await edPage.click('button[type=submit]');
await edPage.waitForSelector('text=Your password is set');
await edPage.screenshot({ path: out + 'password-set.png' });
await edPage.goto(link, { waitUntil: 'networkidle' });
await edPage.fill('#pw', 'another-password');
await edPage.fill('#pw2', 'another-password');
await edPage.click('button[type=submit]');
check('the link works only once', await edPage.waitForSelector('text=expired or was already used', { timeout: 5000 }).then(() => true, () => false));

await edPage.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await edPage.fill('#login-email', email);
await edPage.fill('#login-password', 'neda-password-1');
await edPage.click('button[type=submit]');
await edPage.waitForURL(`${BASE}/admin`);
check('editors do not see Users', (await edPage.locator('nav a[href="/admin/users"]').count()) === 0);

// Admin makes them an admin, then deactivates them: their session ends.
await ad.reload({ waitUntil: 'networkidle' });
const row = ad.locator(`tr[data-email="${email}"]`);
check('after signing in they show as active', (await row.locator('text=Active').count()) === 1);
await row.locator('select').selectOption('admin');
await ad.waitForTimeout(500);
await edPage.reload({ waitUntil: 'networkidle' });
check('a new role applies at once', (await edPage.locator('nav a[href="/admin/users"]').count()) === 1);
await row.locator('button:has-text("Deactivate")').click();
await ad.waitForSelector(`tr[data-email="${email}"]:has-text("Deactivated")`);
await edPage.goto(`${BASE}/admin/media`);
await edPage.waitForURL(/\/admin\/login/);
check('deactivation signs them out', edPage.url().includes('/admin/login'));

// Wrong passwords lock the account; the message is translated in Persian.
await edPage.click('[role=radio][lang=fa]');
await row.locator('button:has-text("Reactivate")').click();
await ad.waitForTimeout(400);
for (let i = 0; i < 5; i++) {
  await edPage.fill('#login-email', email);
  await edPage.fill('#login-password', `wrong-${i}`);
  await edPage.click('button[type=submit]');
  await edPage.waitForTimeout(250);
}
await edPage.fill('#login-password', 'neda-password-1');
await edPage.click('button[type=submit]');
await edPage.waitForSelector('text=این حساب ۱۵ دقیقه قفل است');
check('lockout after 5 wrong passwords, in Persian', true);
await edPage.screenshot({ path: out + 'locked-fa.png' });
await ad.reload({ waitUntil: 'networkidle' });
check('the admin sees it as locked', (await row.locator('text=Locked').count()) === 1);

// Forgot password: without email set up, it says whom to ask.
await edPage.click('text=فراموشی رمز؟');
await edPage.waitForSelector('text=پیوند رمز جدید بخواهید');
check('forgot password explains what to do without email', true);

// ---------- Your account: change your own password ----------
await ad.goto(`${BASE}/admin/account`, { waitUntil: 'networkidle' });
await ad.fill('#pw-current', ADMIN.password);
await ad.fill('#pw-new', 'temporary-admin-1');
await ad.fill('#pw-repeat', 'temporary-admin-1');
await ad.click('button:has-text("Change password")');
await ad.waitForSelector('text=Password changed.');
check('password change keeps you signed in here', (await ad.evaluate(async () => (await fetch('/api/auth/me')).status)) === 200);
await ad.fill('#pw-current', 'temporary-admin-1');
await ad.fill('#pw-new', ADMIN.password);
await ad.fill('#pw-repeat', ADMIN.password);
// Changing the password signs this tab back in with the new one; wait for that before logging out.
await Promise.all([ad.waitForResponse((r) => r.url().endsWith('/api/auth/login')), ad.click('button:has-text("Change password")')]);
await ad.click('button:has-text("Log out")');
await ad.waitForURL(/\/admin\/login/);
check('log out ends the session', (await ad.evaluate(async () => (await fetch('/api/auth/me')).status)) === 401);

check('no Content-Security-Policy violations', violations.length === 0, violations.join('\n'));
await browser.close();
finish();
