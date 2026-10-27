// The sublimation designer: visitors send a design (preview + print file), admins see it and call back.
// Run: API_URL=http://localhost:3001/api npm run test:e2e -w @profiterol/api
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

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

/** A 1×1 PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

let pageId;
let ip = 10;

/** Sends a design from a new address each time, so the rate limit does not get in the way. */
function send(answers, { preview = PNG, print = PNG, printType = 'image/png', extra = {}, visitor } = {}) {
  const form = new FormData();
  form.set('locale', 'en');
  form.set('data', JSON.stringify(answers));
  form.set('startedAt', String(Date.now() - 10000));
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  if (preview) form.set('preview', new Blob([preview], { type: 'image/png' }), 'preview.png');
  if (print) form.set('print', new Blob([print], { type: printType }), 'print.png');
  return fetch(`${API}/public/designs/${pageId}/designer`, {
    method: 'POST',
    body: form,
    headers: { 'x-forwarded-for': `203.0.113.${ip++}`, ...(visitor ? { 'x-visitor-key': visitor } : {}) },
  });
}

const good = {
  product: 1,
  color: '#FFFFFF',
  material: 'Satin',
  size: 'L',
  quantity: 3,
  name: 'Sara',
  phone: '+98 912 000 0000',
  email: 'sara@example.com',
  notes: 'Gift wrap please',
  printPx: [2000, 2000],
  layers: ['Photo: cat.jpg', 'Text: “Hi”'],
  background: '#ffffff',
};

before(async () => {
  token = (await call('POST', '/auth/login', ADMIN, false)).body.token;
  const page = (await call('POST', '/admin/pages', { name: 'Designer test' })).body;
  pageId = page.id;
  const saved = await call('PATCH', `/admin/pages/${pageId}`, {
    translations: [
      {
        locale: 'en',
        title: 'Designer',
        slug: 'designer-test',
        blocks: [
          {
            id: 'designer',
            type: 'textile-designer',
            props: {
              products: [
                { surface: 'mug', name: 'Mug', price: '', sizes: '' },
                { surface: 'tshirt', name: 'Shirt', price: '', sizes: 'M, L' },
              ],
              colors: '#ffffff, #fef3c7',
              materials: 'Polyester, Satin',
              maxQuantity: 10,
              maxDesigns: 3,
              maxPhotos: 2,
            },
          },
        ],
      },
    ],
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  await call('POST', `/admin/pages/${pageId}/publish`);
});

after(async () => {
  await call('DELETE', `/admin/pages/${pageId}`);
});

describe('sublimation designs', () => {
  test('the page id is attached to the designer block', async () => {
    const pub = (await call('GET', '/public/en/page?slug=designer-test', undefined, false)).body;
    assert.deepEqual(pub.blocks[0].data, { pageId, blockId: 'designer' });
  });

  test('a design reaches the admin, who can open it, call back and delete it', async () => {
    const res = await send(good);
    assert.equal(res.status, 200, await res.clone().text());
    const { id } = await res.json();

    assert.ok((await call('GET', '/admin/designs/new-count')).body.count >= 1);
    const item = (await call('GET', '/admin/designs')).body.find((d) => d.id === id);
    assert.equal(item.product, 'Shirt');
    assert.equal(item.surface, 'tshirt');
    assert.equal(item.color, '#ffffff');
    assert.equal(item.quantity, 3);
    assert.deepEqual(item.details.printCm, [76, 76]);
    assert.equal('preview' in item || 'printFile' in item, false, 'the pictures are not in the list');

    const file = await fetch(`${API}/admin/designs/${id}/print?download=1`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/png');
    assert.match(file.headers.get('content-disposition'), /^attachment/);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), PNG);
    assert.equal((await fetch(`${API}/admin/designs/${id}/preview`)).status, 401, 'designs are private');

    const updated = await call('PATCH', `/admin/designs/${id}`, { status: 'called', adminNote: 'Confirmed, size L' });
    assert.equal(updated.body.status, 'called');
    assert.equal((await call('PATCH', `/admin/designs/${id}`, { status: 'shipped' })).status, 400);
    assert.equal((await call('DELETE', `/admin/designs/${id}`)).status, 204);
    assert.equal((await call('GET', `/admin/designs/${id}/preview`)).status, 404);
  });

  test('answers are checked against the published block', async () => {
    assert.equal((await send({ ...good, product: 5 })).status, 400, 'unknown product');
    assert.equal((await send({ ...good, color: '#000000' })).status, 400, 'color not offered');
    assert.equal((await send({ ...good, size: 'XXL' })).status, 400, 'size not offered');
    assert.equal((await send({ ...good, quantity: 11 })).status, 400, 'above the largest quantity');
    const noPhone = await send({ ...good, phone: '' });
    assert.equal(noPhone.status, 400);
    assert.ok((await noPhone.json()).errors.length);
    assert.equal((await send({ ...good, product: 0, size: '' })).status, 200, 'a product with one size');
  });

  test('one person can send only as many designs as the block allows', async () => {
    const phone = '+98 935 111 2233';
    const a = await send({ ...good, phone: '09351112233' });
    assert.equal(a.status, 200, 'the same number typed another way counts too');
    assert.equal((await send({ ...good, phone })).status, 200);
    assert.equal((await send({ ...good, phone: '۰۹۳۵۱۱۱۲۲۳۳' })).status, 200);
    const over = await send({ ...good, phone });
    assert.equal(over.status, 400);
    assert.equal((await over.json()).limit, 3);

    // A cancelled order frees its place.
    await call('PATCH', `/admin/designs/${(await a.json()).id}`, { status: 'cancelled' });
    assert.equal((await send({ ...good, phone })).status, 200);
    assert.equal((await send({ ...good, phone })).status, 400);
  });

  test('one browser is counted too, whatever number it gives', async () => {
    const visitor = 'v'.repeat(20) + Date.now().toString(36).padStart(20, '0');
    for (let i = 0; i < 3; i++) assert.equal((await send({ ...good, phone: `0911000000${i}` }, { visitor })).status, 200);
    assert.equal((await send({ ...good, phone: '09110000009' }, { visitor })).status, 400);
  });

  test('a design can have only as many photos as the block allows', async () => {
    const res = await send({ ...good, phone: '09129990000', layers: ['Photo: a.jpg', 'Photo: b.jpg', 'Photo: c.jpg'] });
    assert.equal(res.status, 400);
    assert.match((await res.json()).errors[0], /up to 2 photo/);
  });

  test('visitors see their own designs and nobody else’s', async () => {
    const visitor = 'm'.repeat(20) + Date.now().toString(36).padStart(20, '0');
    const sent = await send({ ...good, phone: '09127770000' }, { visitor });
    const { id } = await sent.json();
    const mine = (key) =>
      fetch(`${API}/public/designs/${pageId}/designer/mine?locale=en`, { headers: key ? { 'x-visitor-key': key } : {} }).then((r) =>
        r.json(),
      );
    const list = await mine(visitor);
    assert.equal(list.limit, 3);
    assert.equal(list.used, 1);
    assert.deepEqual(
      list.designs.map((d) => d.id),
      [id],
    );
    assert.equal(list.designs[0].status, 'new');
    assert.equal('phone' in list.designs[0] || 'name' in list.designs[0], false, 'no personal details');
    assert.deepEqual((await mine('x'.repeat(40))).designs, [], 'another browser sees nothing');
    assert.deepEqual((await mine()).designs, []);

    const preview = await fetch(`${API}/public/designs/mine/${id}/preview`, { headers: { 'x-visitor-key': visitor } });
    assert.equal(preview.status, 200);
    assert.deepEqual(Buffer.from(await preview.arrayBuffer()), PNG);
    const other = await fetch(`${API}/public/designs/mine/${id}/preview`, { headers: { 'x-visitor-key': 'x'.repeat(40) } });
    assert.equal(other.status, 404);

    await call('PATCH', `/admin/designs/${id}`, { status: 'production' });
    assert.equal((await mine(visitor)).designs[0].status, 'production', 'the visitor sees where the order stands');
  });

  test('pictures must be real pictures', async () => {
    assert.equal((await send(good, { print: null })).status, 400, 'missing print file');
    assert.equal((await send(good, { print: Buffer.from('<script>alert(1)</script>') })).status, 400, 'not a PNG');
    assert.equal((await send(good, { printType: 'image/svg+xml' })).status, 400, 'SVG refused');
  });

  test('bots and unknown designers are turned away', async () => {
    const before = (await call('GET', '/admin/designs')).body.length;
    assert.equal((await send(good, { extra: { website: 'spam.example' } })).status, 200);
    assert.equal((await call('GET', '/admin/designs')).body.length, before, 'honeypot design not stored');
    const res = await fetch(`${API}/public/designs/${pageId}/nope`, { method: 'POST', body: new FormData() });
    assert.equal(res.status, 400, 'missing fields');
    for (const d of (await call('GET', '/admin/designs')).body.filter((x) => x.pageId === pageId)) {
      await call('DELETE', `/admin/designs/${d.id}`);
    }
  });
});
