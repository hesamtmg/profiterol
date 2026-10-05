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
      translations: [
        { locale: 'en', title: 'x', slug: 'home', blocks: [{ id: 'a', type: 'statement', props: { buttonLink: 'javascript:alert(1)' } }] },
      ],
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
    const saved = await call('PATCH', `/admin/pages/${id}`, {
      translations: [{ locale: 'en', title: 'Classic test', slug: 'classic-test', blocks }],
    });
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
        {
          locale: 'en',
          title: 'Sara Ahmadi',
          slug: 'sara',
          excerpt: 'Designer',
          tags: ['Design', 'Design', ' '],
          data: { role: 'Designer', removed: 'x' },
        },
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
    assert.deepEqual(pub.body.alternates.map((a) => a.path).sort(), ['team-e2e/sara', 'تیم-آزمایشی/سارا'].sort());

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
    assert.deepEqual(
      msg.data.map((d) => d.label),
      ['Name', 'Email', 'What do you need?', 'Message'],
    );
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
      fonts: [
        { name: 'Brand', files: [{ url: font.body.url, weight: 700, style: 'normal' }] },
        { name: 'x;}', files: [] },
      ],
      theme: { fontEn: 'Brand', primary: '#112233' },
      savedThemes: [{ key: 'brand', name: 'Brand look', theme: { fontEn: 'Brand', primary: 'not-a-color' } }],
      loader: { enabled: true, style: 'name', text: { en: 'Loading' } },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.fonts.map((f) => f.name),
      ['Brand'],
    );
    assert.equal(res.body.theme.fontEn, 'Brand');
    assert.deepEqual(res.body.savedThemes, [{ key: 'brand', name: 'Brand look', theme: { fontEn: 'Brand' } }]);
    assert.equal(res.body.loader.style, 'name');

    const page = (await call('GET', '/admin/pages')).body[0];
    const pageTheme = await call('PATCH', `/admin/pages/${page.id}`, { theme: { fontFa: 'Brand', fontEn: 'Unknown Font' } });
    assert.deepEqual(pageTheme.body.theme, { fontFa: 'Brand' });

    // Put things back for the other tests.
    await call('PATCH', `/admin/pages/${page.id}`, { theme: page.theme });
    await call('PUT', '/admin/settings', {
      fonts: before.fonts,
      theme: before.theme,
      savedThemes: before.savedThemes,
      loader: before.loader,
    });
  });
});

describe('image sizes', () => {
  const ORIGIN = API.replace(/\/api$/, '');
  const upload = async (bytes, name, type) => {
    const body = new FormData();
    body.append('file', new Blob([bytes], { type }), name);
    const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body });
    return { status: res.status, body: await res.json() };
  };

  test('photos get WebP copies at web widths, never enlarged, removed with the photo', async () => {
    const { default: sharp } = await import('sharp');
    const jpg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#00a998' } })
      .jpeg()
      .toBuffer();
    const res = await upload(jpg, 'wide.jpg', 'image/jpeg');
    assert.equal(res.status, 201);
    assert.equal(res.body.width, 1200);
    assert.equal(res.body.height, 800);

    // Every width exists (the site builds srcset from the URL alone); widths above the photo's own are capped.
    const base = res.body.url.replace(/\.jpg$/, '');
    for (const w of [480, 960, 1600, 2400]) {
      const r = await fetch(`${ORIGIN}${base}-${w}.webp`);
      assert.equal(r.status, 200, `${w}w copy`);
      assert.equal(r.headers.get('content-type'), 'image/webp');
      const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
      assert.equal(meta.width, Math.min(w, 1200), `${w}w copy is not enlarged`);
    }

    assert.equal((await call('DELETE', `/admin/media/${res.body.id}`)).status, 204);
    assert.equal((await fetch(`${ORIGIN}${base}-480.webp`)).status, 404, 'copies go with the photo');
  });

  test('a file that starts like a JPEG but cannot be decoded is refused', async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    assert.equal((await upload(broken, 'broken.jpg', 'image/jpeg')).status, 400);
  });
});

describe('sessions, users and passwords', () => {
  // Each test signs in from its own made-up address, so they do not add up to the per-address sign-in limit.
  const login = (email, password, ip, extra = {}) =>
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...extra },
      body: JSON.stringify({ email, password }),
    });
  const cookiesOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]);
  const resetSecret = (link) => new URL(link).searchParams.get('token');

  test('the admin gets an httpOnly session cookie, and changes need the CSRF header', async () => {
    const res = await login(ADMIN.email, ADMIN.password, '198.51.100.1', { 'x-session': 'cookie' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.token, undefined, 'no token in the body');
    const raw = res.headers.getSetCookie();
    assert.ok(
      raw.some((c) => c.startsWith('pt_session=') && /HttpOnly/i.test(c)),
      'session cookie is httpOnly',
    );
    assert.ok(
      raw.some((c) => c.startsWith('pt_csrf=') && !/HttpOnly/i.test(c)),
      'csrf cookie is readable',
    );

    const cookie = cookiesOf(res).join('; ');
    const csrf = cookiesOf(res)
      .find((c) => c.startsWith('pt_csrf='))
      .slice('pt_csrf='.length);
    assert.equal((await fetch(`${API}/auth/me`, { headers: { cookie } })).status, 200);
    const settings = await (await fetch(`${API}/admin/settings`, { headers: { cookie } })).json();
    const put = (headers) =>
      fetch(`${API}/admin/settings`, {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ siteName: settings.siteName }),
      });
    assert.equal((await put({})).status, 403, 'no CSRF header');
    assert.equal((await put({ 'x-csrf-token': 'wrong' + csrf.slice(5) })).status, 403, 'wrong CSRF header');
    assert.equal((await put({ 'x-csrf-token': csrf })).status, 200);

    const out = await fetch(`${API}/auth/logout`, { method: 'POST', headers: { cookie } });
    assert.ok(
      out.headers.getSetCookie().some((c) => /^pt_session=;/.test(c)),
      'logout clears the cookie',
    );
  });

  test('security headers and body size limit', async () => {
    const res = await fetch(`${API}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    const big = await call('POST', '/admin/pages', { name: 'x'.repeat(3 * 1024 * 1024) });
    assert.equal(big.status, 413);
  });

  test('invite, choose a password, lockout after 5 wrong passwords, deactivate', async () => {
    const email = `editor-${Date.now()}@example.com`;
    const invited = await call('POST', '/admin/users', { email, name: 'Neda', role: 'editor' });
    assert.equal(invited.status, 201);
    assert.match(invited.body.link, /\/admin\/reset\?token=/);
    const id = invited.body.user.id;
    assert.equal((await login(email, 'anything', '198.51.100.2')).status, 401, 'no password yet');

    const secret = resetSecret(invited.body.link);
    assert.equal((await call('POST', '/auth/reset', { token: secret, password: 'short' }, false)).status, 400);
    assert.equal((await call('POST', '/auth/reset', { token: secret, password: 'a-good-password' }, false)).status, 204);
    assert.equal(
      (await call('POST', '/auth/reset', { token: secret, password: 'another-password' }, false)).status,
      400,
      'links work once',
    );

    const ok = await login(email, 'a-good-password', '198.51.100.2');
    assert.equal(ok.status, 200);
    const editorToken = (await ok.json()).token;
    const asEditor = (method, path, body) =>
      fetch(API + path, {
        method,
        headers: { authorization: `Bearer ${editorToken}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body && JSON.stringify(body),
      });
    assert.equal((await asEditor('GET', '/admin/users')).status, 403, 'editors cannot manage users');
    assert.equal((await asEditor('GET', '/admin/pages')).status, 200);

    for (let i = 0; i < 5; i++) assert.equal((await login(email, 'wrong-password', '198.51.100.3')).status, 401);
    const locked = await login(email, 'a-good-password', '198.51.100.3');
    assert.equal(locked.status, 403, 'locked even with the right password');
    assert.equal((await call('GET', '/admin/users')).body.find((u) => u.id === id).locked, true);

    assert.equal((await call('PATCH', `/admin/users/${id}`, { active: false })).status, 200);
    assert.equal((await asEditor('GET', '/admin/pages')).status, 401, 'deactivation ends open sessions');
    assert.equal((await call('PATCH', `/admin/users/${id}`, { active: true })).status, 200);
    assert.equal((await login(email, 'a-good-password', '198.51.100.4')).status, 200, 'reactivating also unlocks');

    const link = await call('POST', `/admin/users/${id}/reset-link`);
    assert.equal(
      (await call('POST', '/auth/reset', { token: resetSecret(link.body.link), password: 'brand-new-password' }, false)).status,
      204,
    );
    assert.equal((await login(email, 'a-good-password', '198.51.100.5')).status, 401, 'old password stops working');
    await call('PATCH', `/admin/users/${id}`, { active: false });
  });

  test('the last admin stays an admin, and passwords can be changed', async () => {
    const me = (await call('GET', '/auth/me')).body;
    assert.equal((await call('PATCH', `/admin/users/${me.id}`, { role: 'editor' })).status, 400);
    assert.equal((await call('PATCH', `/admin/users/${me.id}`, { active: false })).status, 400);
    assert.equal((await call('POST', '/auth/password', { current: 'nope', password: 'whatever-123' })).status, 400);
    assert.equal((await call('POST', '/auth/forgot', { email: 'nobody@example.com' }, false)).status, 204);

    // Change and change back; the first change signs out the old token.
    assert.equal((await call('POST', '/auth/password', { current: ADMIN.password, password: 'temporary-pass-1' })).status, 204);
    assert.equal((await call('GET', '/auth/me')).status, 401, 'other sessions end');
    token = (await (await login(ADMIN.email, 'temporary-pass-1', '198.51.100.6')).json()).token;
    assert.equal((await call('POST', '/auth/password', { current: 'temporary-pass-1', password: ADMIN.password })).status, 204);
    token = (await (await login(ADMIN.email, ADMIN.password, '198.51.100.6')).json()).token;
    assert.equal((await call('GET', '/auth/me')).status, 200);
  });
});

describe('page history, copies and scheduling', () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const blocks = (title) => [{ id: 'h1', type: 'rich-text', props: { html: `<p>${title}</p>` } }];
  const save = (id, title, slug = 'history-test') =>
    call('PATCH', `/admin/pages/${id}`, { translations: [{ locale: 'en', title, slug, blocks: blocks(title) }] });

  test('saves are grouped, publishes are kept, and restoring can be undone', async () => {
    const page = (await call('POST', '/admin/pages', { name: 'History test' })).body;
    await save(page.id, 'First');
    await save(page.id, 'Second');
    let revs = (await call('GET', `/admin/pages/${page.id}/revisions`)).body;
    assert.equal(revs.length, 1, 'saves within 10 minutes update one version');
    assert.equal(revs[0].titles.en, 'Second');
    assert.equal(revs[0].author, ADMIN.email);

    await call('POST', `/admin/pages/${page.id}/publish`);
    await save(page.id, 'Third');
    revs = (await call('GET', `/admin/pages/${page.id}/revisions`)).body;
    assert.deepEqual(
      revs.map((r) => [r.kind, r.titles.en]),
      [
        ['save', 'Third'],
        ['publish', 'Second'],
        ['save', 'Second'],
      ],
    );

    const published = revs.find((r) => r.kind === 'publish');
    const full = (await call('GET', `/admin/pages/${page.id}/revisions/${published.id}`)).body;
    assert.equal(full.snapshot.translations.find((t) => t.locale === 'en').blocks[0].props.html, '<p>Second</p>');

    const restored = await call('POST', `/admin/pages/${page.id}/revisions/${published.id}/restore`);
    assert.equal(restored.status, 200);
    assert.equal(restored.body.translations.find((t) => t.locale === 'en').title, 'Second');
    revs = (await call('GET', `/admin/pages/${page.id}/revisions`)).body;
    assert.equal(revs[0].kind, 'restore');
    assert.ok(
      revs.some((r) => r.titles.en === 'Third'),
      'the draft from before the restore is still in the history',
    );
    await call('DELETE', `/admin/pages/${page.id}`);
  });

  test('duplicating makes a draft copy with its own addresses', async () => {
    const page = (await call('POST', '/admin/pages', { name: 'Original' })).body;
    await save(page.id, 'Original', 'original-page');
    const copy = await call('POST', `/admin/pages/${page.id}/duplicate`);
    assert.equal(copy.status, 201);
    assert.equal(copy.body.name, 'Original (copy)');
    assert.equal(copy.body.status, 'draft');
    const en = copy.body.translations.find((t) => t.locale === 'en');
    assert.equal(en.slug, 'original-page-copy');
    assert.equal(en.blocks[0].props.html, '<p>Original</p>');
    assert.notEqual(copy.body.id, page.id);
    await call('DELETE', `/admin/pages/${page.id}`);
    await call('DELETE', `/admin/pages/${copy.body.id}`);
  });

  test('a page goes online and offline at the scheduled times', async () => {
    const page = (await call('POST', '/admin/pages', { name: 'Scheduled' })).body;
    await save(page.id, 'Scheduled', 'scheduled-page');
    const visible = async () => (await call('GET', '/public/en/page?slug=scheduled-page', undefined, false)).status === 200;

    const bad = await call('PATCH', `/admin/pages/${page.id}`, {
      publishAt: new Date(Date.now() + 60_000).toISOString(),
      unpublishAt: new Date(Date.now() + 30_000).toISOString(),
    });
    assert.equal(bad.status, 400, 'offline time must be after the online time');

    await call('PATCH', `/admin/pages/${page.id}`, {
      publishAt: new Date(Date.now() + 1500).toISOString(),
      unpublishAt: new Date(Date.now() + 4000).toISOString(),
    });
    assert.equal(await visible(), false);
    await wait(2500);
    assert.equal(await visible(), true, 'published on time');
    assert.equal((await call('GET', `/admin/pages/${page.id}`)).body.publishAt, null);
    await wait(2500);
    assert.equal(await visible(), false, 'taken offline on time');
    assert.equal((await call('GET', `/admin/pages/${page.id}`)).body.unpublishAt, null);
    await call('DELETE', `/admin/pages/${page.id}`);
  });
});

describe('columns', () => {
  test('a contact form inside columns works on the site', async () => {
    const page = (await call('POST', '/admin/pages', { name: 'Columns test' })).body;
    const fields = [{ label: 'Email', type: 'email', required: true, options: '', placeholder: '' }];
    const blocks = [
      {
        id: 'cols',
        type: 'columns',
        props: { count: '2', bgColor: '#123456' },
        children: [
          [{ id: 'txt', type: 'text', props: { title: 'Left' } }],
          [{ id: 'form', type: 'contact-form', props: { title: 'Nested form', fields } }],
        ],
      },
    ];
    const saved = await call('PATCH', `/admin/pages/${page.id}`, {
      translations: [{ locale: 'en', title: 'Columns', slug: 'columns-test', blocks }],
    });
    assert.equal(saved.status, 200);
    const bad = await call('PATCH', `/admin/pages/${page.id}`, {
      translations: [
        {
          locale: 'en',
          title: 'Columns',
          slug: 'columns-test',
          blocks: [{ ...blocks[0], children: [[{ id: 'h', type: 'spotlight', props: {} }], []] }],
        },
      ],
    });
    assert.equal(bad.status, 400, 'a full-screen block inside columns is refused');

    await call('POST', `/admin/pages/${page.id}/publish`);
    const pub = (await call('GET', '/public/en/page?slug=columns-test', undefined, false)).body;
    assert.deepEqual(pub.blocks[0].children[1][0].data, { pageId: page.id, blockId: 'form' });

    const sent = await fetch(`${API}/public/forms/${page.id}/form`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
      body: JSON.stringify({ locale: 'en', values: ['nested@example.com'], startedAt: Date.now() - 5000 }),
    });
    assert.equal(sent.status, 200);
    const msg = (await call('GET', '/admin/submissions')).body.find((m) => m.formTitle === 'Nested form');
    assert.ok(msg, 'the message reached the inbox');
    await call('DELETE', `/admin/submissions/${msg.id}`);
    await call('DELETE', `/admin/pages/${page.id}`);
  });
});

describe('templates and saved sections', () => {
  test('a page can start from a template, in every language', async () => {
    const list = (await call('GET', '/admin/pages/templates')).body;
    assert.ok(list.some((t) => t.key === 'contact'));
    const page = await call('POST', '/admin/pages', { name: 'From template', template: 'contact' });
    assert.equal(page.status, 201);
    const fa = page.body.translations.find((t) => t.locale === 'fa');
    assert.equal(fa.blocks[0].type, 'columns');
    assert.equal(fa.blocks[0].children[0][0].props.title, 'برای ما بنویسید');
    assert.equal((await call('POST', '/admin/pages', { name: 'x', template: 'nope' })).status, 400);
    await call('DELETE', `/admin/pages/${page.body.id}`);
  });

  test('a site template sets the theme and adds draft pages and menu links', async () => {
    const before = (await call('GET', '/admin/settings')).body;
    const pagesBefore = (await call('GET', '/admin/pages')).body.length;
    const applied = await call('POST', '/admin/site-templates/studio/apply');
    assert.equal(applied.status, 200);
    assert.equal(applied.body.pages.length, 3);
    const after = (await call('GET', '/admin/settings')).body;
    assert.notDeepEqual(after.theme, before.theme);
    assert.ok(after.menu.some((m) => m.label.fa === 'تماس'));
    const pages = (await call('GET', '/admin/pages')).body;
    assert.equal(pages.length, pagesBefore + 3);
    assert.ok(pages.filter((p) => applied.body.pages.some((c) => c.id === p.id)).every((p) => p.status === 'draft' && !p.isHome));
    // Put things back for the other tests.
    for (const p of applied.body.pages) await call('DELETE', `/admin/pages/${p.id}`);
    await call('PUT', '/admin/settings', { theme: before.theme, menu: before.menu });
  });

  test('sections are saved, listed and deleted, and are not public', async () => {
    const block = {
      id: 'sec',
      type: 'columns',
      props: { count: '2' },
      children: [[{ id: 's1', type: 'text', props: { title: 'Saved' } }], []],
    };
    const saved = await call('POST', '/admin/sections', { name: 'Two columns', block });
    assert.equal(saved.status, 201);
    assert.equal((await call('POST', '/admin/sections', { name: 'Bad', block: { id: 'b', type: 'nope', props: {} } })).status, 400);
    const list = (await call('GET', '/admin/sections')).body;
    assert.equal(list[0].name, 'Two columns');
    assert.equal(list[0].block.children[0][0].props.title, 'Saved');
    const pub = (await call('GET', '/public/settings', undefined, false)).body;
    assert.equal(pub.sections, undefined, 'not sent to visitors');
    assert.equal((await call('DELETE', `/admin/sections/${saved.body.key}`)).status, 204);
    assert.equal((await call('GET', '/admin/sections')).body.length, 0);
  });
});

describe('media library details', () => {
  const ORIGIN = API.replace(/\/api$/, '');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  test('descriptions, folders, search, usage, previews and AVIF copies', async () => {
    const { default: sharp } = await import('sharp');
    const jpg = await sharp({ create: { width: 1000, height: 700, channels: 3, background: '#c49a6c' } })
      .jpeg()
      .toBuffer();
    const body = new FormData();
    body.append('file', new Blob([jpg], { type: 'image/jpeg' }), 'harbour.jpg');
    const media = await (await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body })).json();
    const folder = `Harbour ${Date.now()}`;

    const patched = await call('PATCH', `/admin/media/${media.id}`, { alt: { en: 'Boats at dusk', fa: 'قایق‌ها در غروب' }, folder });
    assert.equal(patched.status, 200);
    assert.equal((await call('PATCH', `/admin/media/${media.id}`, { folder: 'a/b' })).status, 400);
    assert.ok((await call('GET', '/admin/media/folders')).body.includes(folder));
    assert.deepEqual(
      (await call('GET', `/admin/media?folder=${encodeURIComponent(folder)}`)).body.map((m) => m.id),
      [media.id],
    );
    assert.ok(
      (await call('GET', '/admin/media?q=dusk')).body.some((m) => m.id === media.id),
      'found by its description',
    );
    assert.ok(!(await call('GET', '/admin/media?kind=video')).body.some((m) => m.id === media.id));

    const listed = (await call('GET', `/admin/media?folder=${encodeURIComponent(folder)}`)).body[0];
    assert.equal(listed.placeholder, undefined, 'the preview is not sent with the library list');
    assert.deepEqual(listed.usedIn, []);

    const page = (await call('POST', '/admin/pages', { name: 'Media usage' })).body;
    const blocks = [{ id: 'im', type: 'image-text', props: { image: media.url } }];
    await call('PATCH', `/admin/pages/${page.id}`, { translations: [{ locale: 'fa', title: 'x', slug: 'media-usage', blocks }] });
    await call('POST', `/admin/pages/${page.id}/publish`);
    const used = (await call('GET', `/admin/media?folder=${encodeURIComponent(folder)}`)).body[0].usedIn;
    assert.deepEqual(used, [{ kind: 'page', id: page.id, name: 'Media usage' }]);

    const pub = (await call('GET', '/public/fa/page?slug=media-usage', undefined, false)).body;
    assert.match(pub.media[media.url].blur, /^data:image\/webp;base64,/);
    assert.equal(pub.media[media.url].alt, 'قایق‌ها در غروب');

    // AVIF copies are made after the upload; browsers that accept AVIF get them for the WebP address.
    const copy = `${ORIGIN}${media.url.replace(/\.jpg$/, '-480.webp')}`;
    let type = '';
    for (let i = 0; i < 40 && type !== 'image/avif'; i++) {
      type = (await fetch(copy, { headers: { accept: 'image/avif,image/webp' } })).headers.get('content-type');
      if (type !== 'image/avif') await wait(250);
    }
    assert.equal(type, 'image/avif');
    const plain = await fetch(copy, { headers: { accept: 'image/webp' } });
    assert.equal(plain.headers.get('content-type'), 'image/webp');
    assert.match(plain.headers.get('vary') ?? '', /Accept/);

    await call('DELETE', `/admin/pages/${page.id}`);
    await call('DELETE', `/admin/media/${media.id}`);
  });
});
