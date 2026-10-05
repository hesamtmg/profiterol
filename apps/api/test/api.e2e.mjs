// End-to-end checks against a running API with a freshly migrated and seeded database.
// Run: API_URL=http://localhost:3001/api npm run test:e2e -w @profiterol/api
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
let token = '';

async function call(method, path, body, auth = true) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  const res = await call('POST', '/auth/login', ADMIN, false);
  assert.equal(res.status, 200, 'admin login');
  token = res.body.token;
});

describe('auth', () => {
  test('rejects a wrong password and anonymous admin calls', async () => {
    assert.equal((await call('POST', '/auth/login', { ...ADMIN, password: 'nope' }, false)).status, 401);
    assert.equal((await call('GET', '/admin/pages', undefined, false)).status, 401);
  });
});

describe('public site', () => {
  test('health and seeded home page in both languages', async () => {
    assert.equal((await call('GET', '/health')).body.status, 'ok');
    for (const locale of ['en', 'fa']) {
      const page = await call('GET', `/public/${locale}/page`, undefined, false);
      assert.equal(page.status, 200);
      assert.equal(page.body.isHome, true);
      const list = page.body.blocks.find((b) => b.type === 'collection-list');
      assert.ok(list.data.items.length > 0, 'collection list items are attached');
      assert.ok(list.data.items[0].href.startsWith(`/${locale}/`));
    }
  });

  test('unknown locale and page return 404', async () => {
    assert.equal((await call('GET', '/public/xx/page')).status, 404);
    assert.equal((await call('GET', '/public/en/page?slug=does-not-exist')).status, 404);
  });

  test('sitemap lists pages and collection items', async () => {
    const res = await call('GET', '/public/sitemap');
    assert.ok(res.body.some((e) => e.slug === '' && e.locale === 'en'));
    assert.ok(res.body.some((e) => e.slug.startsWith('projects/')));
  });
});

describe('pages', () => {
  test('block validation rejects unsafe links', async () => {
    const pages = (await call('GET', '/admin/pages')).body;
    const res = await call('PATCH', `/admin/pages/${pages[0].id}`, {
      translations: [{ locale: 'en', title: 'x', slug: 'home', blocks: [{ id: 'a', type: 'statement', props: { buttonLink: 'javascript:alert(1)' } }] }],
    });
    assert.equal(res.status, 400);
  });

  test('classic sections: rich text is cleaned on save, and the contact block sends to the inbox', async () => {
    const created = await call('POST', '/admin/pages', { name: 'Classic test' });
    assert.equal(created.status, 201);
    const id = created.body.id;
    const html =
      '<h2 onclick="x()">Hi</h2><script>alert(1)</script><img src=x onerror="alert(2)"><p><a href="javascript:alert(3)">bad</a> <a href="https://example.com" target="_blank">ok</a></p>';
    const fields = [{ label: 'Email', type: 'email', required: true, options: '', placeholder: '' }];
    const blocks = [
      { id: 'rt', type: 'rich-text', props: { html } },
      { id: 'cs', type: 'contact-split', props: { title: 'Talk to us', fields } },
    ];
    const saved = await call('PATCH', `/admin/pages/${id}`, { translations: [{ locale: 'en', title: 'Classic test', slug: 'classic-test', blocks }] });
    assert.equal(saved.status, 200);
    const clean = saved.body.translations.find((t) => t.locale === 'en').blocks[0].props.html;
    assert.equal(clean, '<h2>Hi</h2><p><a>bad</a> <a href="https://example.com" target="_blank" rel="noopener noreferrer">ok</a></p>');

    assert.equal((await call('POST', `/admin/pages/${id}/publish`)).status, 200);
    const page = await call('GET', '/public/en/page?slug=classic-test', undefined, false);
    const form = page.body.blocks.find((b) => b.type === 'contact-split');
    assert.deepEqual(form.data, { pageId: id, blockId: 'cs' });

    // A separate visitor address, so this message does not count towards the contact form tests' rate limit.
    const sent = await fetch(`${API}/public/forms/${id}/cs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({ locale: 'en', values: ['sara@example.com'], startedAt: Date.now() - 5000 }),
    });
    assert.equal(sent.status, 200);
    const msg = (await call('GET', '/admin/submissions')).body[0];
    assert.equal(msg.formTitle, 'Talk to us');
    await call('PATCH', `/admin/submissions/${msg.id}`, { read: true });
    assert.equal((await call('DELETE', `/admin/pages/${id}`)).status, 204);
  });
});

describe('collections', () => {
  let collection;
  let item;

  test('creates a collection and validates its definition', async () => {
    assert.equal((await call('POST', '/admin/collections', { key: 'Bad Key', name: {}, slugs: {} })).status, 400);
    assert.equal(
      (await call('POST', '/admin/collections', { key: 'team-e2e', name: { en: 'Team' }, slugs: { en: 'projects', fa: 'تیم' } })).status,
      400,
      'slug already used by Projects',
    );
    const res = await call('POST', '/admin/collections', {
      key: 'team-e2e',
      name: { en: 'Team', fa: 'تیم' },
      slugs: { en: 'team-e2e', fa: 'تیم-آزمایشی' },
      fields: [{ key: 'role', label: 'Role', type: 'text', labels: { fa: 'نقش' } }],
    });
    assert.equal(res.status, 201);
    collection = res.body;
    assert.equal(collection.fields[0].labels.fa, 'نقش');
  });

  test('creates, validates and publishes an item', async () => {
    item = (await call('POST', `/admin/collections/${collection.id}/items`, { title: 'Sara Ahmadi' })).body;
    assert.equal(item.translations.length, 2);
    assert.equal(item.status, 'draft');

    const bad = await call('PATCH', `/admin/collections/${collection.id}/items/${item.id}`, {
      translations: [{ locale: 'en', title: 'Sara', slug: 'sara', data: { role: 42 } }],
    });
    assert.equal(bad.status, 400);

    const ok = await call('PATCH', `/admin/collections/${collection.id}/items/${item.id}`, {
      cover: '/uploads/sara.jpg',
      translations: [
        { locale: 'en', title: 'Sara Ahmadi', slug: 'sara', excerpt: 'Designer', tags: ['Design', 'Design', ' '], data: { role: 'Designer', removed: 'x' } },
        { locale: 'fa', title: 'سارا احمدی', slug: 'سارا', data: { role: 'طراح' } },
      ],
    });
    assert.equal(ok.status, 200);
    const en = ok.body.translations.find((t) => t.locale === 'en');
    assert.deepEqual(en.tags, ['Design'], 'tags are trimmed and deduplicated');
    assert.deepEqual(en.data, { role: 'Designer' }, 'values for unknown fields are dropped');

    assert.equal((await call('GET', `/public/en/item?collection=team-e2e&slug=sara`)).status, 404, 'drafts are hidden');
    await call('POST', `/admin/collections/${collection.id}/items/${item.id}/publish`);
    const pub = await call('GET', `/public/en/item?collection=team-e2e&slug=sara`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.item.data.role, 'Designer');
    assert.deepEqual(
      pub.body.alternates.map((a) => a.path).sort(),
      ['team-e2e/sara', 'تیم-آزمایشی/سارا'].sort(),
    );

    const list = await call('GET', '/public/en/items?collection=team-e2e&tag=Design');
    assert.equal(list.body.items.length, 1);
    assert.equal((await call('GET', '/public/en/items?collection=team-e2e&tag=Nope')).body.items.length, 0);
  });

  test('item slugs are unique per collection and language', async () => {
    const other = (await call('POST', `/admin/collections/${collection.id}/items`, { title: 'Sara' })).body;
    const en = other.translations.find((t) => t.locale === 'en');
    assert.equal(en.slug, 'sara-2', 'new items get a free slug');
    const res = await call('PATCH', `/admin/collections/${collection.id}/items/${other.id}`, {
      translations: [{ locale: 'en', title: 'Sara', slug: 'sara' }],
    });
    assert.equal(res.status, 409);
  });

  test('deleting a collection removes its items', async () => {
    assert.equal((await call('DELETE', `/admin/collections/${collection.id}`)).status, 204);
    assert.equal((await call('GET', `/public/en/item?collection=team-e2e&slug=sara`)).status, 404);
  });
});

describe('contact forms', () => {
  let pageId;
  let blockId;

  before(async () => {
    const page = await call('GET', '/public/en/page?slug=contact', undefined, false);
    assert.equal(page.status, 200, 'seeded contact page');
    pageId = page.body.id;
    const form = page.body.blocks.find((b) => b.type === 'contact-form');
    blockId = form.id;
    assert.equal(form.data.pageId, pageId, 'the page id is attached to the form block');
  });

  const send = (values, extra = {}) =>
    call('POST', `/public/forms/${pageId}/${blockId}`, { locale: 'en', values, startedAt: Date.now() - 5000, ...extra }, false);

  test('unknown forms and the private notification address are not exposed', async () => {
    const res = await call('POST', `/public/forms/${pageId}/nope`, { locale: 'en', values: [] }, false);
    assert.equal(res.status, 404);
    const settings = await call('GET', '/public/settings', undefined, false);
    assert.equal('notifyEmail' in settings.body, false);
  });
  test('validates answers against the published form', async () => {
    // Fields: Name*, Email*, What do you need?* (Website, Branding, Something else), Message*
    assert.equal((await send(['Sara', '', 'Website', 'Hi'])).status, 400, 'required');
    assert.equal((await send(['Sara', 'not-an-email', 'Website', 'Hi'])).status, 400, 'email format');
    assert.equal((await send(['Sara', 'sara@example.com', 'Plumbing', 'Hi'])).status, 400, 'choice');
  });

  test('stores a valid message and lists it in the inbox', async () => {
    const res = await send(['Sara', 'sara@example.com', 'Branding', 'We need a new logo.']);
    assert.equal(res.status, 200);
    assert.match(res.body.message, /Thank you/);

    const unread = await call('GET', '/admin/submissions/unread-count');
    assert.equal(unread.body.count, 1);
    const list = await call('GET', '/admin/submissions');
    const msg = list.body[0];
    assert.deepEqual(msg.data.map((d) => d.label), ['Name', 'Email', 'What do you need?', 'Message']);
    assert.equal(msg.data[3].value, 'We need a new logo.');
    assert.equal(msg.pageTitle, 'Contact');

    assert.equal((await call('PATCH', `/admin/submissions/${msg.id}`, { read: true })).body.read, true);
    assert.equal((await call('GET', '/admin/submissions/unread-count')).body.count, 0);
    assert.equal((await call('GET', '/admin/submissions', undefined, false)).status, 401);
  });

  test('bots: the hidden field is ignored silently, instant submits are refused, and senders are rate-limited', async () => {
    const before = (await call('GET', '/admin/submissions')).body.length;
    const bot = await send(['Bot', 'bot@example.com', 'Website', 'spam'], { website: 'http://spam.example' });
    assert.equal(bot.status, 200);
    assert.equal((await call('GET', '/admin/submissions')).body.length, before, 'honeypot message not stored');
    assert.equal((await send(['Bot', 'bot@example.com', 'Website', 'spam'], { startedAt: Date.now() })).status, 400);

    // Five attempts were counted above (one unknown form, three invalid, one valid); the limit is five per ten minutes.
    // The hidden-field and too-fast attempts are refused before they are counted.
    assert.equal((await send(['Sara', 'sara@example.com', 'Website', 'Again'])).status, 429);
  });

});

describe('media types and site fonts', () => {
  const upload = async (bytes, name, type) => {
    const body = new FormData();
    body.append('file', new Blob([bytes], { type }), name);
    const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body });
    return { status: res.status, body: await res.json() };
  };

  test('files are checked by their first bytes, and fonts are accepted by extension', async () => {
    const { readFileSync } = await import('node:fs');
    const woff2 = readFileSync(new URL('../../../node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2', import.meta.url));
    const font = await upload(woff2, 'Brand-Bold.woff2', 'application/octet-stream');
    assert.equal(font.status, 201);
    assert.match(font.body.url, /^\/uploads\/[\w-]+\.woff2$/);
    assert.equal(font.body.mime, 'font/woff2');

    assert.equal((await upload(Buffer.from('<script>alert(1)</script>'), 'photo.jpg', 'image/jpeg')).status, 400, 'a script named .jpg');
    assert.equal((await upload(Buffer.from('not a font'), 'fake.woff2', 'font/woff2')).status, 400, 'a text file named .woff2');
    assert.equal((await upload(Buffer.from('MZ'), 'tool.exe', 'application/octet-stream')).status, 400, 'other types');

    // Uploaded fonts can then be used by themes, saved themes and pages.
    const before = (await call('GET', '/admin/settings')).body;
    const res = await call('PUT', '/admin/settings', {
      fonts: [{ name: 'Brand', files: [{ url: font.body.url, weight: 700, style: 'normal' }] }, { name: 'x;}', files: [] }],
      theme: { fontEn: 'Brand', primary: '#112233' },
      savedThemes: [{ key: 'brand', name: 'Brand look', theme: { fontEn: 'Brand', primary: 'not-a-color' } }],
      loader: { enabled: true, style: 'name', text: { en: 'Loading' } },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.fonts.map((f) => f.name), ['Brand']);
    assert.equal(res.body.theme.fontEn, 'Brand');
    assert.deepEqual(res.body.savedThemes, [{ key: 'brand', name: 'Brand look', theme: { fontEn: 'Brand' } }]);
    assert.equal(res.body.loader.style, 'name');

    const page = (await call('GET', '/admin/pages')).body[0];
    const pageTheme = await call('PATCH', `/admin/pages/${page.id}`, { theme: { fontFa: 'Brand', fontEn: 'Unknown Font' } });
    assert.deepEqual(pageTheme.body.theme, { fontFa: 'Brand' });

    // Put things back for the other tests.
    await call('PATCH', `/admin/pages/${page.id}`, { theme: page.theme });
    await call('PUT', '/admin/settings', { fonts: before.fonts, theme: before.theme, savedThemes: before.savedThemes, loader: before.loader });
  });
});
