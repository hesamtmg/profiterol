// Responsive images in server-rendered pages, and the admin in Persian.
import { ADMIN, API, apiToken, BASE, check, finish, launch, photo, watch } from './lib.mjs';

const browser = await launch();

const token = await apiToken();
const call = async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json().catch(() => null);
};

// ---------- srcset in the server HTML ----------
const jpg = await photo({ width: 2000, height: 1200 });
const form = new FormData();
form.append('file', new Blob([jpg], { type: 'image/jpeg' }), 'photo.jpg');
const media = await (await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form })).json();
const slug = `photo-${Date.now()}`;
const page = await call('POST', '/admin/pages', { name: 'Photo test' });
const blocks = [{ id: 'it', type: 'image-text', props: { title: 'Photo', text: 'Hi', image: media.url } }];
await call('PATCH', `/admin/pages/${page.id}`, { translations: [{ locale: 'en', title: 'Photo test', slug, blocks }, { locale: 'fa', title: 'عکس', slug, blocks }] });
await call('POST', `/admin/pages/${page.id}/publish`);
const html = await (await fetch(`${BASE}/en/${slug}`)).text();
const img = html.match(new RegExp(`<img[^>]*${media.url.replace(/[.]/g, '\\.')}[^>]*>`))?.[0] ?? '';
const id = media.url.match(/\/uploads\/([\w-]+)\./)[1];
check('srcset: rendered on the server with every width', [480, 960, 1600, 2400].every((w) => img.includes(`/uploads/${id}-${w}.webp ${w}w`)), img);
check('srcset: sizes is set', /sizes="[^"]+"/.test(img), img);
const variant = await fetch(`${BASE}/uploads/${id}-960.webp`);
check('srcset: the 960w copy is served as WebP', variant.ok && variant.headers.get('content-type') === 'image/webp');

const site = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
watch(site);
const loaded = [];
site.on('response', (r) => r.url().includes(`/uploads/${id}`) && loaded.push(r.url()));
await site.goto(`${BASE}/en/${slug}`, { waitUntil: 'networkidle' });
await site.locator(`img[src="${media.url}"]`).scrollIntoViewIfNeeded();
await site.waitForTimeout(800);
check('srcset: a phone loads a WebP copy, not the original', loaded.some((u) => u.endsWith('.webp')) && !loaded.some((u) => u.endsWith('.jpg')), loaded.join(' '));

// ---------- Persian admin ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const ad = await ctx.newPage();
watch(ad);
await ad.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
check('admin: English by default here', (await ad.evaluate(() => document.documentElement.dir)) !== 'rtl');
await ad.click('[role=radiogroup] [role=radio][lang=fa]');
await ad.waitForTimeout(300);
check('admin: switching to Persian turns the page right-to-left', (await ad.evaluate(() => document.documentElement.dir)) === 'rtl');
check('admin: the login form is in Persian', (await ad.locator('button[type=submit]', { hasText: 'ورود' }).count()) === 1, await ad.locator('button[type=submit]').innerText());
await ad.fill('input[type=email]', ADMIN.email);
await ad.fill('input[type=password]', ADMIN.password);
await ad.click('button[type=submit]');
await ad.waitForURL(`${BASE}/admin`);
await ad.waitForTimeout(500);
check('admin: nav is translated', (await ad.locator('header a', { hasText: 'صفحه‌ها' }).count()) > 0 && (await ad.locator('header a', { hasText: 'رسانه' }).count()) > 0);
await ad.reload({ waitUntil: 'networkidle' });
check('admin: the language is remembered', (await ad.evaluate(() => document.documentElement.dir)) === 'rtl');

await ad.goto(`${BASE}/admin/pages/${page.id}`, { waitUntil: 'networkidle' });
await ad.waitForSelector('main [id^=blk-]');
check('editor: block names in Persian', (await ad.locator('text=تصویر + متن').count()) > 0);
check('editor: the site content keeps its own direction', (await ad.locator('main [dir=ltr]').count()) > 0);
await ad.click('[role=radiogroup] [role=radio][lang=en]');
await ad.waitForTimeout(300);
check('editor: switching back to English', (await ad.evaluate(() => document.documentElement.dir)) === 'ltr' && (await ad.locator('text=Image + text').count()) > 0);

await call('DELETE', `/admin/pages/${page.id}`);
await browser.close();
finish();
