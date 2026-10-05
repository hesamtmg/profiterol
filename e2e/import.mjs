// Importing a minicms site (scripts/import-minicms.mjs): pages, sections, pictures, posts and redirects.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { api, API, apiToken, BASE, check, finish, photo, shots } from './lib.mjs';

const dir = shots('import');
const uploads = `${dir}uploads/`;
mkdirSync(`${uploads}images/pages`, { recursive: true });
for (const name of ['side', 'one', 'two'])
  writeFileSync(`${uploads}images/pages/${name}.jpg`, await photo({ width: 1200, height: 800, label: name }));

const token = await apiToken();
// Leftovers from an earlier run: these pages, the post and the old addresses.
for (const r of await api(token, 'GET', '/admin/redirects'))
  if (/^\/(page|post|posts|blog)(\/|$)/.test(r.from)) await api(token, 'DELETE', `/admin/redirects/${r.id}`);
const blog = (await api(token, 'GET', '/admin/collections')).find((c) => c.key === 'blog');
for (const i of await api(token, 'GET', `/admin/collections/${blog.id}/items`))
  if (i.translations?.some((t) => t.slug === 'hello-world')) await api(token, 'DELETE', `/admin/collections/${blog.id}/items/${i.id}`);
const pages = await api(token, 'GET', '/admin/pages');
for (const p of pages)
  if (['About us', 'Services'].includes(p.name) && p.translations.some((t) => t.slug === 'about-us' || t.slug === 'services'))
    await api(token, 'DELETE', `/admin/pages/${p.id}`);

const run = () =>
  spawnSync(
    process.execPath,
    [
      new URL('../scripts/import-minicms.mjs', import.meta.url).pathname,
      new URL('./fixtures/minicms-sample.sql', import.meta.url).pathname,
      '--uploads',
      uploads,
      '--publish',
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, API_URL: API },
    },
  );
const first = run();
console.log(first.stdout.trim(), first.stderr.trim());
check('the import finishes', first.status === 0, first.stderr);
check(
  'it reports what it did',
  /Imported 2 page\(s\) with 4 section\(s\), 1 collection item\(s\), 3 file\(s\)/.test(first.stdout),
  first.stdout,
);
check(
  'it names the unknown section kind and the missing file',
  /unknown kinds left out: 99/.test(first.stdout) && /missing\.jpg/.test(first.stdout),
);

const about = (await api(token, 'GET', '/admin/pages')).find((p) => p.name === 'About us');
const fa = about.translations.find((t) => t.locale === 'fa');
const en = about.translations.find((t) => t.locale === 'en');
check(
  'sections become blocks in their order',
  fa.blocks.map((b) => b.type).join() === 'triple,side-by-side,rich-text',
  fa.blocks.map((b) => b.type).join(),
);
check('Persian and English texts', fa.blocks[0].props.title === 'کارهای ما' && en.blocks[0].props.title === 'Our work');
check(
  'editor HTML becomes plain text',
  en.blocks[0].props.items[0].text === 'Houses\nand offices' && en.blocks[1].props.lines[0].text === 'First line & more',
);
check('free text keeps its formatting', en.blocks[2].props.html.includes('<strong>text</strong>'));
check('pictures are uploaded', /^\/uploads\/.+\.jpg$/.test(fa.blocks[0].props.items[0].image) && fa.blocks[0].props.items[2].image === '');
check('addresses and SEO come along', en.slug === 'about-us' && fa.slug === 'درباره-ما' && en.seoTitle === 'About the studio');

const services = (await api(token, 'GET', '/admin/pages')).find((p) => p.name === 'Services');
const grid = services.translations.find((t) => t.locale === 'en').blocks[0];
check('the grid kind with its sizes', grid.type === 'photo-grid' && grid.props.size === '2*2' && grid.props.items[1].title === 'Two');

// Old addresses lead to the new pages and post.
const go = async (path) => {
  const res = await fetch(BASE + encodeURI(path), { redirect: 'manual' });
  return `${res.status} ${decodeURI(new URL(res.headers.get('location') ?? '/', BASE).pathname)}`;
};
check('/page/about-us redirects to the new page', (await go('/page/about-us')) === '301 /fa/درباره-ما', await go('/page/about-us'));
check('the Persian old address too', (await go('/page/درباره-ما')) === '301 /fa/درباره-ما');
check(
  '/post/hello-world redirects to the blog post',
  (await go('/post/hello-world')).startsWith('301 /fa/') && (await go('/post/hello-world')).endsWith('/hello-world'),
  await go('/post/hello-world'),
);
const html = await (await fetch(`${BASE}/en/about-us`)).text();
check('the imported page is live', html.includes('Our work') && html.includes('Years of work'));

const again = run();
check('running it again skips pages already there', /Skipped \(already there\): About us, Services/.test(again.stdout), again.stdout);

finish();
