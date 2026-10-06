import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businessCategories, cleanBusiness, findBusinessType, isLocalBusiness, jsonLdScript, siteJsonLd } from '../dist/esm/index.js';

const base = { origin: 'https://example.com', homeUrl: 'https://example.com/en', name: 'Bean There', locale: 'en', logo: '' };

test('every business type is offered once, with both labels, in a category ending with its general choice', () => {
  const types = businessCategories.flatMap((c) => c.types.map((t) => t.type));
  assert.equal(new Set(types).size, types.length);
  for (const c of businessCategories) {
    assert.ok(c.label.en && c.label.fa && c.icon, c.key);
    for (const t of c.types) assert.ok(t.label.en && t.label.fa, t.type);
  }
  assert.equal(findBusinessType('CafeOrCoffeeShop').category.key, 'food');
});

test('cleanBusiness drops unknown types, unknown fields and unsafe profile links', () => {
  const b = cleanBusiness({
    type: 'Hacker',
    evil: 1,
    phone: ' 123 ',
    sameAs: ['https://instagram.com/x', 'javascript:alert(1)', 'http://x.com'],
  });
  assert.equal(b.type, '');
  assert.equal(b.phone, '123');
  assert.equal('evil' in b, false);
  assert.deepEqual(b.sameAs, ['https://instagram.com/x']);
});

test('site JSON-LD uses the chosen type and leaves out empty details', () => {
  assert.equal(siteJsonLd({ ...base, business: {} }), null);
  const data = siteJsonLd({ ...base, business: { type: 'CafeOrCoffeeShop', city: 'Tehran', priceRange: '$$', phone: '' } });
  const [owner, site] = data['@graph'];
  assert.equal(owner['@type'], 'CafeOrCoffeeShop');
  assert.deepEqual(owner.address, { '@type': 'PostalAddress', addressLocality: 'Tehran' });
  assert.equal(owner.priceRange, '$$');
  assert.equal('telephone' in owner, false);
  assert.deepEqual(site.publisher, { '@id': owner['@id'] });
});

test('price range is only for places customers visit', () => {
  assert.equal(isLocalBusiness('Restaurant'), true);
  assert.equal(isLocalBusiness('Corporation'), false);
  const [owner] = siteJsonLd({ ...base, business: { type: 'Corporation', priceRange: '$$' } })['@graph'];
  assert.equal('priceRange' in owner, false);
});

test('JSON-LD cannot close its script tag', () => {
  const out = jsonLdScript(siteJsonLd({ ...base, name: '</script><script>alert(1)</script>', business: { type: 'Person' } }));
  assert.equal(out.includes('<'), false);
  assert.equal(JSON.parse(out)['@graph'][0].name, '</script><script>alert(1)</script>');
});
