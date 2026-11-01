// Previews made by a site's own admins: the owner allows it site by site with limits, the site's admins make
// previews under their own address, see only theirs, send their admin panels to anyone, and ask the owner to move a
// bought one to its own address. Run against a running API, like the other e2e files.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const PREVIEW_HOST = new URL(process.env.PREVIEW_URL ?? 'http://localhost:8080').host;
const run = Date.now().toString(36);
const AGENCY = `agency-${run}.test`;
const CAFE = `cafe-${run}`;
let owner = '';
let agent = '';
const ids = {};

async function call(method, path, { host = 'localhost', prefix = '', body, token = owner, ip } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'x-forwarded-host': host,
      ...(prefix ? { 'x-site-prefix': prefix } : {}),
      ...(ip ? { 'x-forwarded-for': ip } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

/** The agency site's admin, on the agency's address. */
const agency = (method, path, opts = {}) => call(method, path, { host: AGENCY, token: agent, ...opts });
const token = (link) => new URL(link).searchParams.get('token');

before(async () => {
  owner = (await call('POST', '/auth/login', { body: ADMIN, token: '', ip: '198.51.100.70' })).body.token;
  const site = await call('POST', '/admin/sites', { body: { name: 'Agency', domain: AGENCY, demo: false, adminEmail: `boss@${AGENCY}` } });
  assert.equal(site.status, 201, JSON.stringify(site.body));
  ids.agency = site.body.site.id;
  const reset = await call('POST', '/auth/reset', {
    host: AGENCY,
    token: '',
    body: { token: token(site.body.invite.link), password: 'agency-pass-1' },
  });
  assert.equal(reset.status, 204);
  const login = await call('POST', '/auth/login', {
    host: AGENCY,
    token: '',
    body: { email: `boss@${AGENCY}`, password: 'agency-pass-1' },
    ip: '198.51.100.71',
  });
  agent = login.body.token;
  assert.ok(agent, 'the agency admin signs in');
});

after(async () => {
  if (ids.own) await call('DELETE', `/admin/sites/${ids.own}`, { body: { confirm: `own-${run}` } });
  if (ids.agency) await call('DELETE', `/admin/sites/${ids.agency}`, { body: { confirm: AGENCY } });
});

describe('previews made by a site', () => {
  test('only where the owner allows it, and only the owner allows it', async () => {
    assert.equal((await agency('GET', '/admin/previews')).status, 403, 'off by default');
    assert.equal(
      (await agency('PATCH', `/admin/sites/${ids.agency}`, { body: { previewsAllowed: true } })).status,
      403,
      'not by the site’s admin',
    );
    const me = await agency('GET', '/auth/me');
    assert.equal(me.body.site.hostsPreviews, null);

    const allowed = await call('PATCH', `/admin/sites/${ids.agency}`, {
      body: { previewsAllowed: true, previewMax: 2, previewMaxDays: 10 },
    });
    assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
    assert.equal(allowed.body.previewsAllowed, true);
    assert.deepEqual((await agency('GET', '/auth/me')).body.site.hostsPreviews, { max: 2, maxDays: 10 });
    const list = await agency('GET', '/admin/previews');
    assert.equal(list.status, 200);
    assert.deepEqual([list.body.max, list.body.maxDays, list.body.live, list.body.previews.length], [2, 10, 0, 0]);
  });

  test('the site’s admin makes previews under their own address, within the limits', async () => {
    assert.equal(
      (await agency('POST', '/admin/previews', { body: { name: 'Cafe', slug: CAFE, days: 20 } })).status,
      400,
      'over the days limit',
    );
    const res = await agency('POST', '/admin/previews', {
      body: { name: 'Cafe', slug: CAFE, template: 'studio', days: 7, adminEmail: `owner@${CAFE}.test` },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.cafe = res.body.site.id;
    assert.equal(res.body.site.url, `http://${AGENCY}/preview/${CAFE}`, 'on the agency’s own address');
    assert.ok(res.body.invite.link.startsWith(`http://${AGENCY}/preview/${CAFE}/admin/reset?token=`));

    const settings = await call('GET', '/public/settings', { host: AGENCY, prefix: `/preview/${CAFE}`, token: '' });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.origin, `http://${AGENCY}/preview/${CAFE}`);
    assert.equal(settings.body.preview.home, `http://${AGENCY}`, '"keep this site" leads to the agency');
    assert.equal(settings.body.seo.hideSite, true);
    assert.equal(
      (await call('GET', '/public/settings', { host: PREVIEW_HOST, prefix: `/preview/${CAFE}`, token: '' })).status,
      404,
      'not on PREVIEW_URL',
    );
    assert.equal(
      (await call('GET', '/public/settings', { host: 'localhost', prefix: `/preview/${CAFE}`, token: '' })).status,
      404,
      'not on other sites',
    );
    assert.equal(
      (await call('GET', '/public/settings', { host: AGENCY, token: '' })).body.previewHome,
      `http://${AGENCY}`,
      'its robots.txt hides /preview/',
    );

    const second = await agency('POST', '/admin/previews', { body: { name: 'Two', slug: `${CAFE}-2`, template: 'blank' } });
    assert.equal(second.status, 201);
    ids.second = second.body.site.id;
    const third = await agency('POST', '/admin/previews', { body: { name: 'Three', slug: `${CAFE}-3`, template: 'blank' } });
    assert.equal(third.status, 400, 'over the number limit');
    assert.match(third.body.message, /2 previews/);
  });

  test('it sees only its own previews; the owner sees everyone’s', async () => {
    const own = await call('POST', '/admin/sites/previews', { body: { name: 'Owner’s', slug: `own-${run}`, template: 'blank' } });
    assert.equal(own.status, 201);
    ids.own = own.body.site.id;

    const list = (await agency('GET', '/admin/previews')).body;
    assert.deepEqual(list.previews.map((p) => p.id).sort(), [ids.cafe, ids.second].sort());
    assert.equal(
      (await agency('PATCH', `/admin/previews/${ids.own}`, { body: { prospect: 'mine now' } })).status,
      404,
      'not someone else’s',
    );
    assert.equal((await agency('POST', `/admin/previews/${ids.own}/invite`, { body: { email: `x@${run}.test` } })).status, 404);
    assert.equal((await agency('GET', '/admin/sites')).status, 403, 'and not the owner’s list');

    const all = (await call('GET', '/admin/sites')).body.sites;
    const cafe = all.find((s) => s.id === ids.cafe);
    assert.equal(cafe.previewHostId, ids.agency);
    assert.equal(cafe.previewHostName, 'Agency');
    assert.equal(all.find((s) => s.id === ids.own).previewHostId, null);
  });

  test('more time stays within the limit; only the owner sets the end date', async () => {
    assert.equal((await agency('PATCH', `/admin/previews/${ids.cafe}`, { body: { extendDays: 5 } })).status, 400, '7 + 5 > 10');
    const ok = await agency('PATCH', `/admin/previews/${ids.cafe}`, { body: { extendDays: 3, prospect: 'Called' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.prospect, 'Called');
    assert.equal(
      (await agency('PATCH', `/admin/previews/${ids.cafe}`, { body: { expiresAt: new Date(Date.now() + 9e10).toISOString() } })).status,
      403,
    );
    const owned = await call('PATCH', `/admin/sites/${ids.cafe}/preview`, { body: { extendDays: 30 } });
    assert.equal(owned.status, 200, 'the owner is not held to the limit');
  });

  test('anyone can be sent the preview’s admin panel, but never an owner’s account', async () => {
    const refused = await agency('POST', `/admin/previews/${ids.cafe}/invite`, { body: { email: ADMIN.email } });
    assert.equal(refused.status, 409, 'an owner’s email gets no password link');
    const sent = await agency('POST', `/admin/previews/${ids.cafe}/invite`, { body: { email: `designer@${run}.test` } });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.ok(sent.body.link.startsWith(`http://${AGENCY}/preview/${CAFE}/admin/reset?token=`));
    const again = await agency('POST', `/admin/previews/${ids.cafe}/invite`, { body: { email: `designer@${run}.test` } });
    assert.equal(again.status, 200, 'asking again gives a new link');
    assert.notEqual(token(again.body.link), token(sent.body.link));

    const prefix = `/preview/${CAFE}`;
    assert.equal(
      (
        await call('POST', '/auth/reset', {
          host: AGENCY,
          prefix,
          token: '',
          body: { token: token(again.body.link), password: 'designer-pass-1' },
        })
      ).status,
      204,
    );
    const login = await call('POST', '/auth/login', {
      host: AGENCY,
      prefix,
      token: '',
      body: { email: `designer@${run}.test`, password: 'designer-pass-1' },
      ip: '198.51.100.72',
    });
    assert.equal(login.status, 200, 'they sign in to the preview');
    const me = await call('GET', '/auth/me', { host: AGENCY, prefix, token: login.body.token });
    assert.equal(me.body.site.id, ids.cafe);
    assert.equal((await call('GET', '/admin/previews', { host: AGENCY, token: login.body.token })).status, 401, 'not on the agency');
  });

  test('a bought preview: the site asks, the owner converts', async () => {
    assert.equal((await agency('POST', `/admin/sites/${ids.cafe}/convert`, { body: { domain: `${CAFE}.test` } })).status, 403);
    const asked = await agency('POST', `/admin/previews/${ids.cafe}/convert-request`, { body: { domain: `https://${CAFE}.TEST/` } });
    assert.equal(asked.status, 200, JSON.stringify(asked.body));
    assert.equal(asked.body.convertRequest, `${CAFE}.test`);
    assert.equal((await call('GET', `/admin/sites/${ids.cafe}`)).body.convertRequest, `${CAFE}.test`, 'the owner sees the request');
  });

  test('turning it off stops new previews; deleting the site deletes its previews', async () => {
    await call('PATCH', `/admin/sites/${ids.agency}`, { body: { previewsAllowed: false } });
    assert.equal((await agency('GET', '/admin/previews')).status, 403);
    assert.equal(
      (await call('GET', '/public/settings', { host: AGENCY, prefix: `/preview/${CAFE}`, token: '' })).status,
      200,
      'existing ones stay online',
    );

    assert.equal((await call('DELETE', `/admin/sites/${ids.agency}`, { body: { confirm: AGENCY } })).status, 204);
    ids.agency = undefined;
    assert.equal((await call('GET', `/admin/sites/${ids.cafe}`)).status, 404);
    assert.equal((await call('GET', `/admin/sites/${ids.second}`)).status, 404);
  });
});
