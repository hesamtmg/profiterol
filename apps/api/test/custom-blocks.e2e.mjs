// The AI block builder, end to end, with a stand-in AI service (an OpenAI-compatible server started here).
// Run with the other e2e tests: API_URL=http://localhost:3001/api npm run test:e2e -w @profiterol/api
// The API must be able to reach this machine's 127.0.0.1 (true when both run on the same host).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const KEY = 'sk-test-0123456789abcdef';
let token = '';

async function call(method, path, body, bearer = token) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // JavaScript modules stay text.
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

const DEF = {
  label: 'Price cards',
  icon: 'mdi-cash',
  description: 'Plans side by side',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'plans',
      label: 'Plans',
      type: 'list',
      itemLabel: 'name',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
      ],
    },
  ],
  defaults: { title: 'Pricing', plans: [{ name: 'Basic', price: '$5' }] },
};
const SOURCE = `<script setup>
import { computed } from 'vue';
const props = defineProps({ p: { type: Object, required: true }, locale: String });
const plans = computed(() => props.p.plans ?? []);
</script>
<template>
  <section class="prices"><h2>{{ p.title }}</h2>
    <div v-for="(plan, i) in plans" :key="i" class="card">{{ plan.name }} {{ plan.price }}</div>
  </section>
</template>
<style scoped>.card { background: var(--c-surface); }</style>`;

/** What the stand-in AI answers next; each request takes the first item. */
const answers = [];
const requests = [];
let server;
let aiUrl = '';

before(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw);
      requests.push({ auth: req.headers.authorization, body });
      const answer = answers.shift() ?? { summary: 'ok', def_json: JSON.stringify(DEF), source: SOURCE };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  aiUrl = `http://127.0.0.1:${server.address().port}/v1`;
  const res = await call('POST', '/auth/login', ADMIN, '');
  assert.equal(res.status, 200, 'admin login');
  token = res.body.token;
});

after(() => server?.close());

describe('AI settings', () => {
  test('the key is stored but never sent back', async () => {
    const saved = await call('PUT', '/admin/settings/ai', {
      enabled: true,
      provider: 'openai-compatible',
      model: 'test-model',
      apiKey: KEY,
      baseUrl: aiUrl,
      dailyLimit: 100,
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.hasKey, true);
    assert.equal(saved.body.keyHint, 'cdef');
    assert.equal(saved.body.ready, true);
    for (const path of ['/admin/settings/ai', '/admin/settings', '/public/settings']) {
      const res = await call('GET', path);
      assert.ok(!JSON.stringify(res.body).includes(KEY), `${path} does not reveal the key`);
      assert.ok(!JSON.stringify(res.body).includes('apiKeyEnc'), `${path} does not include the encrypted key`);
    }
    // Saving other settings keeps the AI settings.
    assert.equal((await call('PUT', '/admin/settings', { maintenance: false })).status, 200);
    const again = await call('PUT', '/admin/settings/ai', { model: 'test-model' });
    assert.equal(again.body.hasKey, true, 'an empty key field keeps the saved key');
  });

  test('test connection uses the saved key and model', async () => {
    const res = await call('POST', '/admin/settings/ai/test');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    const last = requests.at(-1);
    assert.equal(last.auth, `Bearer ${KEY}`);
    assert.equal(last.body.model, 'test-model');
  });
});

describe('custom blocks', () => {
  let block;

  test('the AI builds a block; problems go back to it to fix', async () => {
    answers.push({
      summary: 'first try',
      def_json: JSON.stringify(DEF),
      source: SOURCE.replace('const plans =', 'fetch("/api/x");\nconst plans ='),
    });
    const before = requests.length;
    const res = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    block = res.body;
    assert.match(block.type, /^ai-price-cards-[0-9a-f]{6}$/);
    assert.equal(block.status, 'draft');
    assert.equal(requests.length - before, 2, 'one fix round');
    const fix = requests.at(-1).body.messages.at(-1).content;
    assert.match(fix, /"fetch" is not allowed/);
    assert.equal(block.conversation.at(-1).text, 'ok', 'the builder shows the summary');
    assert.match(block.draft.compiled, /export default function \(Vue\)/);
  });

  test('unapproved blocks cannot be used or loaded', async () => {
    const page = await call('POST', '/admin/pages', { name: `Custom ${Date.now()}` });
    const node = { id: 'c1', type: block.type, props: { title: 'Hi' } };
    const en = page.body.translations.find((t) => t.locale === 'en');
    const res = await call('PATCH', `/admin/pages/${page.body.id}`, {
      translations: [{ locale: 'en', title: en.title, slug: en.slug, blocks: [node] }],
    });
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(res.body), /unknown block type/);
    const schema = await call('GET', '/admin/pages/schema');
    assert.ok(!schema.body.custom.some((c) => c.def.type === block.type));
  });

  test('a hand edit is checked too', async () => {
    const bad = await call('PUT', `/admin/custom-blocks/${block.id}/draft`, {
      def: DEF,
      source: SOURCE.replace('<h2>', '<h2 v-html="p.title">'),
    });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.problems.some((p) => p.includes('v-html')));
    const badDef = await call('PUT', `/admin/custom-blocks/${block.id}/draft`, {
      def: { ...DEF, fields: [{ key: 'bgColor', label: 'x', type: 'text' }] },
      source: SOURCE,
    });
    assert.equal(badDef.status, 422);
  });

  test('approve, use on a page, publish, load its code', async () => {
    const approved = await call('POST', `/admin/custom-blocks/${block.id}/approve`);
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, 'live');
    assert.equal(approved.body.changed, false);

    const schema = await call('GET', '/admin/pages/schema');
    const entry = schema.body.custom.find((c) => c.def.type === block.type);
    assert.ok(entry, 'in the editor schema');
    assert.ok(
      entry.def.fields.some((f) => f.key === 'bgColor'),
      'with the shared style fields',
    );

    const slug = `custom-${Date.now()}`;
    const page = await call('POST', '/admin/pages', { name: slug });
    const node = { id: 'c1', type: block.type, props: { title: 'Our prices', bgColor: '#ffeecc' } };
    const translations = page.body.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      slug: t.slug,
      blocks: t.locale === 'en' ? [node] : [],
    }));
    const saved = await call('PATCH', `/admin/pages/${page.body.id}`, { translations });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal((await call('POST', `/admin/pages/${page.body.id}/publish`)).status, 200);

    const enSlug = page.body.translations.find((t) => t.locale === 'en').slug;
    const pub = await call('GET', `/public/en/page?slug=${enSlug}`, undefined, '');
    assert.equal(pub.status, 200);
    const script = pub.body.customBlocks.find((c) => c.type === block.type);
    assert.ok(script, 'the page says where to load the block');
    assert.equal(script.defaults.title, 'Pricing');
    const mod = await call('GET', script.url.replace(/^\/api/, ''), undefined, '');
    assert.equal(mod.status, 200);
    assert.match(mod.headers.get('content-type'), /javascript/);
    assert.match(mod.body, /__scopeId/);
    assert.equal(
      (await call('GET', script.url.replace(/^\/api/, '').replace(/[0-9a-f]{12}\.js$/, '000000000000.js'), undefined, '')).status,
      404,
    );

    // In use: cannot be deleted, only disabled.
    assert.equal((await call('DELETE', `/admin/custom-blocks/${block.id}`)).status, 409);
    assert.equal((await call('POST', `/admin/custom-blocks/${block.id}/disable`)).status, 200);
    const hidden = await call('GET', `/public/en/page?slug=${enSlug}`, undefined, '');
    assert.equal(hidden.body.customBlocks.length, 0, 'a disabled block is not loaded');
    assert.equal((await call('POST', `/admin/custom-blocks/${block.id}/enable`)).status, 200);
  });

  test('changes stay in the draft until approved again', async () => {
    answers.push({
      summary: 'bigger',
      def_json: JSON.stringify({ ...DEF, label: 'Price cards 2' }),
      source: SOURCE.replace('<h2>', '<h2 class="big">'),
    });
    const res = await call('POST', `/admin/custom-blocks/${block.id}/refine`, { prompt: 'Bigger title' });
    assert.equal(res.status, 200);
    assert.equal(res.body.changed, true);
    assert.equal(res.body.type, block.type, 'the type never changes');
    const sent = requests.at(-1).body.messages;
    assert.equal(sent.at(-1).content, 'Bigger title');
    assert.ok(
      sent.some((m) => m.content === 'A pricing table'),
      'earlier requests are sent along',
    );
  });

  test('the daily limit is kept', async () => {
    const view = await call('GET', '/admin/settings/ai');
    await call('PUT', '/admin/settings/ai', { dailyLimit: view.body.usedToday });
    const res = await call('POST', `/admin/custom-blocks/${block.id}/refine`, { prompt: 'Again' });
    assert.equal(res.status, 429);
    await call('PUT', '/admin/settings/ai', { dailyLimit: 100 });
  });

  test('without a key the builder explains what to do', async () => {
    await call('PUT', '/admin/settings/ai', { clearKey: true });
    const res = await call('POST', '/admin/custom-blocks', { prompt: 'Anything at all' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Settings → AI/);
    await call('PUT', '/admin/settings/ai', { apiKey: KEY });
  });
});
