// Preview sites: trials the owner makes for people thinking of buying a site, at <PREVIEW_URL>/preview/<name>.
// Run against a running API started with PREVIEW_URL=http://localhost:8080 (as CI does). nginx takes the preview's
// path off the address and sends it as X-Site-Prefix; the tests send it the same way.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const PREVIEW_URL = (process.env.PREVIEW_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const PREVIEW_HOST = new URL(PREVIEW_URL).host;
const run = Date.now().toString(36);
const SLUG = `ali-${run}`;
const PREFIX = `/preview/${SLUG}`;
const BOUGHT = `ali-${run}.test`;
let owner = '';
let prospect = '';
const ids = {};

async function call(method, path, { host = 'localhost', prefix = '', body, token = owner, headers = {}, ip } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'x-forwarded-host': host,
      ...(prefix ? { 'x-site-prefix': prefix } : {}),
      ...(ip ? { 'x-forwarded-for': ip } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
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
  return { status: res.status, body: json, headers: res.headers };
}

/** A request for the preview, as nginx sends it. */
const preview = (method, path, opts = {}) => call(method, path, { host: PREVIEW_HOST, prefix: PREFIX, ...opts });

before(async () => {
  const res = await call('POST', '/auth/login', { body: ADMIN, token: '', ip: '198.51.100.60' });
  assert.equal(res.status, 200, 'owner login');
  owner = res.body.token;
});

after(async () => {
  if (ids.preview) await call('DELETE', `/admin/sites/${ids.preview}`, { body: { confirm: ids.converted ? BOUGHT : SLUG } });
  if (ids.blank) await call('DELETE', `/admin/sites/${ids.blank}`, { body: { confirm: `${SLUG}-b` } });
});

describe('preview sites', () => {
  test('the owner makes a preview from a template, with its pages published and its admin invited', async () => {
    assert.equal((await call('POST', '/admin/sites/previews', { body: { name: 'x', slug: 'Bad Name!' } })).status, 400);
    assert.equal((await call('POST', '/admin/sites/previews', { body: { name: 'x', slug: 'admin' } })).status, 400, 'reserved');
    assert.equal(
      (await call('POST', '/admin/sites/previews', { body: { name: 'x', slug: `${SLUG}-t`, template: 'nope' } })).status,
      400,
      'unknown template',
    );

    const res = await call('POST', '/admin/sites/previews', {
      body: { name: 'Ali’s shop', slug: SLUG, template: 'bold-studio', days: 10, prospect: 'Ali, 0912…', adminEmail: `ali@${run}.test` },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.preview = res.body.site.id;
    assert.equal(res.body.site.preview, true);
    assert.equal(res.body.site.url, `${PREVIEW_URL}${PREFIX}`);
    assert.deepEqual(res.body.site.domains, [], 'a preview has no addresses of its own');
    const days = (new Date(res.body.site.expiresAt).getTime() - Date.now()) / 86_400_000;
    assert.ok(days > 9.9 && days <= 10, `ends in 10 days (${days})`);
    assert.ok(res.body.invite.link.startsWith(`${PREVIEW_URL}${PREFIX}/admin/reset?token=`), 'the invitation points at the preview');
    ids.invite = new URL(res.body.invite.link).searchParams.get('token');

    const taken = await call('POST', '/admin/sites/previews', { body: { name: 'again', slug: SLUG } });
    assert.equal(taken.status, 409, 'the name is taken');

    const home = await preview('GET', '/public/en/page?slug=', { token: '' });
    assert.equal(home.status, 200, 'the template’s first page is the published home page');
    assert.ok(home.body.blocks.length > 0);
    const pages = (await preview('GET', '/admin/pages')).body;
    assert.ok(pages.length >= 3 && pages.every((p) => p.status === 'published'), 'every template page is published');
    assert.equal(pages.filter((p) => p.isHome).length, 1);
  });

  test('it answers only under its path on PREVIEW_URL’s address, and is hidden from search engines', async () => {
    const settings = await preview('GET', '/public/settings', { token: '' });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.origin, `${PREVIEW_URL}${PREFIX}`);
    assert.equal(settings.body.seo.hideSite, true, 'never indexed');
    assert.equal(settings.body.preview.expired, false);
    assert.equal(settings.body.preview.home, PREVIEW_URL);

    const elsewhere = await call('GET', '/public/settings', { host: 'other.test', prefix: PREFIX, token: '' });
    assert.notEqual(elsewhere.body?.origin, `${PREVIEW_URL}${PREFIX}`, 'the prefix means nothing on another address');
    assert.equal((await call('GET', '/public/settings', { host: PREVIEW_HOST, prefix: '/preview/no-such-one', token: '' })).status, 404);
    assert.equal((await call('GET', '/public/settings', { host: PREVIEW_HOST, prefix: '/elsewhere/x', token: '' })).status, 404);

    const main = await call('GET', '/public/settings', { host: PREVIEW_HOST, token: '' });
    assert.notEqual(main.body.origin, `${PREVIEW_URL}${PREFIX}`, 'without the prefix it is the main site');
    assert.equal(main.body.preview, null);

    const agent = await call('GET', '/internal/sites', { token: '', headers: { 'x-internal-token': process.env.INTERNAL_TOKEN ?? '' } });
    if (agent.status === 200) assert.ok(!agent.body.some((s) => s.id === ids.preview), 'the domains agent never sees previews');
  });

  test('the prospect signs in to the preview’s admin; the cookies stay under its path', async () => {
    assert.equal(
      (await preview('POST', '/auth/reset', { token: '', body: { token: ids.invite, password: 'prospect-pass-1' } })).status,
      204,
    );
    const login = await preview('POST', '/auth/login', {
      token: '',
      body: { email: `ali@${run}.test`, password: 'prospect-pass-1' },
      headers: { 'x-session': 'cookie' },
      ip: '198.51.100.61',
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const cookies = login.headers.getSetCookie();
    assert.ok(cookies.length >= 2);
    for (const c of cookies) assert.match(c, new RegExp(`Path=${PREFIX}(;|$)`), `kept to the preview: ${c}`);

    const tokenLogin = await preview('POST', '/auth/login', {
      token: '',
      body: { email: `ali@${run}.test`, password: 'prospect-pass-1' },
      ip: '198.51.100.61',
    });
    prospect = tokenLogin.body.token;
    const me = await preview('GET', '/auth/me', { token: prospect });
    assert.equal(me.body.role, 'admin');
    assert.equal(me.body.site.preview.expired, false);
    assert.equal((await call('GET', '/auth/me', { host: PREVIEW_HOST, token: prospect })).status, 401, 'not on the main site');
    assert.equal((await preview('GET', '/admin/sites', { token: prospect })).status, 403, 'owner pages stay locked');

    const page = (await preview('GET', '/admin/pages', { token: prospect })).body[0];
    assert.equal((await preview('POST', `/admin/pages/${page.id}/publish`, { token: prospect })).status, 200, 'they can edit and publish');
  });

  test('when its time is up it goes offline for the prospect but not the owner, until extended', async () => {
    const ended = await call('PATCH', `/admin/sites/${ids.preview}/preview`, {
      body: { expiresAt: new Date(Date.now() - 1000).toISOString() },
    });
    assert.equal(ended.status, 200, JSON.stringify(ended.body));
    assert.equal(ended.body.expired, true);

    assert.equal((await preview('GET', '/public/settings', { token: '' })).body.preview.expired, true, 'the site shows it has ended');
    const refused = await preview('GET', '/admin/pages', { token: prospect });
    assert.equal(refused.status, 403);
    assert.match(refused.body.message, /preview has ended/);
    const login = await preview('POST', '/auth/login', {
      token: '',
      body: { email: `ali@${run}.test`, password: 'prospect-pass-1' },
      ip: '198.51.100.62',
    });
    assert.equal(login.status, 403, 'and cannot sign in');
    assert.equal((await preview('GET', '/admin/pages')).status, 200, 'the owner still can');

    const extended = await call('PATCH', `/admin/sites/${ids.preview}/preview`, { body: { extendDays: 7, prospect: 'Called back' } });
    assert.equal(extended.body.expired, false);
    assert.equal(extended.body.prospect, 'Called back');
    const days = (new Date(extended.body.expiresAt).getTime() - Date.now()) / 86_400_000;
    assert.ok(days > 6.9 && days <= 7, 'seven days from now, since it had ended');
    assert.equal((await preview('GET', '/admin/pages', { token: prospect })).status, 200, 'back for the prospect');
  });

  test('an empty preview, and the owner’s delete asks for its name', async () => {
    const res = await call('POST', '/admin/sites/previews', { body: { name: 'Blank', slug: `${SLUG}-b`, template: 'blank' } });
    assert.equal(res.status, 201);
    ids.blank = res.body.site.id;
    assert.equal((await call('GET', '/admin/pages', { host: PREVIEW_HOST, prefix: `${PREFIX}-b` })).body.length, 0);
    assert.equal((await call('DELETE', `/admin/sites/${ids.blank}`, { body: { confirm: 'localhost' } })).status, 400);
    assert.equal((await call('DELETE', `/admin/sites/${ids.blank}`, { body: { confirm: `${SLUG}-b` } })).status, 204);
    ids.blank = undefined;
  });

  test('bought: it becomes a real site on its own address, and its preview link points there', async () => {
    assert.equal(
      (await call('POST', `/admin/sites/${ids.preview}/convert`, { body: { domain: 'localhost' } })).status,
      409,
      'the address must be free',
    );
    const res = await call('POST', `/admin/sites/${ids.preview}/convert`, { body: { domain: BOUGHT, aliases: [`www.${BOUGHT}`] } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    ids.converted = true;
    assert.equal(res.body.preview, false);
    assert.equal(res.body.expiresAt, null);
    assert.equal(res.body.primary, BOUGHT);

    const settings = await call('GET', '/public/settings', { host: BOUGHT, token: '' });
    assert.equal(settings.body.origin, `http://${BOUGHT}`);
    assert.notEqual(settings.body.seo.hideSite, true, 'indexable again');
    assert.equal(settings.body.preview, null);
    assert.equal((await call('GET', '/auth/me', { host: BOUGHT, token: prospect })).status, 200, 'the same account works there');

    const old = await preview('GET', '/public/settings', { token: '' });
    assert.equal(old.body.movedTo, `http://${BOUGHT}`, 'the old link knows where it went');
    assert.equal((await preview('GET', '/public/en/page?slug=', { token: '' })).status, 404, 'and serves nothing else');
    assert.equal((await call('POST', '/admin/sites/previews', { body: { name: 'x', slug: SLUG } })).status, 409, 'its name stays reserved');
  });
});
