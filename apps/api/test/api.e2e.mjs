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
