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
function send(answers, { preview = PNG, print = PNG, printType = 'image/png', extra = {} } = {}) {
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
    headers: { 'x-forwarded-for': `203.0.113.${ip++}` },
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
