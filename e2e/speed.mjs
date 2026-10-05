// The page cache (and that changes in the admin clear it), and fonts served by the site itself.
import { api, apiToken, BASE, check, finish, launch, watch } from './lib.mjs';

const token = await apiToken();
const browser = await launch();
const slug = `cache-${Date.now()}`;
const page = await api(token, 'POST', '/admin/pages', { name: 'Cache test' });
const save = (title) =>
  api(token, 'PATCH', `/admin/pages/${page.id}`, {
    translations: [{ locale: 'en', title, slug, blocks: [{ id: 't', type: 'text', props: { title } }] }],
  });
await save('First title');
await api(token, 'POST', `/admin/pages/${page.id}/publish`);
await new Promise((r) => setTimeout(r, 400));

const get = async () => {
  const res = await fetch(`${BASE}/en/${slug}`);
  return { cache: res.headers.get('x-page-cache'), html: await res.text() };
};
const first = await get();
const second = await get();
check('a page is cached after its first visit', first.cache === 'MISS' && second.cache === 'HIT', `${first.cache} ${second.cache}`);
check('the cached copy is the page', second.html.includes('First title'));

await save('Second title');
await api(token, 'POST', `/admin/pages/${page.id}/publish`);
await new Promise((r) => setTimeout(r, 400));
const after = await get();
check('publishing clears the cache', after.cache === 'MISS' && after.html.includes('Second title'), after.cache);
check('pages with a query are not cached', (await fetch(`${BASE}/en/${slug}?x=1`)).headers.get('x-page-cache') === null);
check('the purge address is not public', (await fetch(`${BASE}/_cache/purge`, { method: 'POST' })).status === 404);

// Fonts: no request leaves the site for them.
const tab = watch(await browser.newPage());
const fontRequests = [];
tab.on('request', (r) => (r.resourceType() === 'font' || /fonts\.(googleapis|gstatic)/.test(r.url()) ? fontRequests.push(r.url()) : null));
await tab.goto(`${BASE}/fa`, { waitUntil: 'networkidle' });
await tab.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
check('fonts come from the site', fontRequests.length > 0 && fontRequests.every((u) => u.startsWith(BASE)), fontRequests.join(' '));
check(
  'the Persian font is loaded on Persian pages',
  fontRequests.some((u) => /vazirmatn/i.test(u)),
  fontRequests.join(' '),
);
check('the page uses it', await tab.evaluate(() => document.fonts.check('16px "Inter Variable"')));

await api(token, 'DELETE', `/admin/pages/${page.id}`);
await browser.close();
finish();
