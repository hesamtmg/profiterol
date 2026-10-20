// The AI block builder, end to end, with a stand-in AI service (an OpenAI-compatible server started here).
// Run with the other e2e tests: API_URL=http://localhost:3001/api npm run test:e2e -w @profiterol/api
// The API must be able to reach this machine's 127.0.0.1 (true when both run on the same host).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const KEY = 'sk-test-0123456789abcdef';
const sharp = createRequire(import.meta.url)('sharp');
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
      res.setHeader('content-type', 'application/json');
      // Like OpenAI: the key's model list, unknown models (names are case-sensitive) and per-model answer limits.
      if (req.method === 'GET' && req.url === '/v1/models') {
        res.end(
          JSON.stringify({
            data: [
              { id: 'gpt-6' },
              { id: 'gpt-5' },
              { id: 'small-model' },
              { id: 'text-embedding-3-small' },
              { id: 'models/gemini-pro' },
              { id: 'meta/llama:free' },
              { id: 'image-maker', architecture: { output_modalities: ['image'] } },
            ],
          }),
        );
        return;
      }
      const body = JSON.parse(raw);
      requests.push({ auth: req.headers.authorization, body });
      if (body.model === 'GPT-6' || body.model === 'gpt-7') {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: `The model \`${body.model}\` does not exist or you do not have access to it.` } }));
        return;
      }
      if (body.model === 'small-model' && body.max_completion_tokens > 16384) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: { message: 'max_tokens is too large: 32000. This model supports at most 16384 completion tokens.' } }),
        );
        return;
      }
      const answer = answers.shift() ?? { summary: 'ok', def_json: JSON.stringify(DEF), source: SOURCE };
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

/** The admin's own AI model for these tests. */
let conn;

/** Invites another admin to the site and signs them in. */
async function otherAdmin() {
  const email = `ai-admin-${Date.now()}@example.com`;
  const invited = await call('POST', '/admin/users', { email, name: 'Other admin', role: 'admin' });
  assert.equal(invited.status, 201);
  const secret = new URL(invited.body.link).searchParams.get('token');
  assert.equal((await call('POST', '/auth/reset', { token: secret, password: 'another-good-password' }, '')).status, 204);
  const res = await call('POST', '/auth/login', { email, password: 'another-good-password' }, '');
  return res.body.token;
}

describe('AI models (each admin their own, per site)', () => {
  test('the key is stored but never sent back', async () => {
    const saved = await call('POST', '/admin/ai/connections', {
      name: 'Stand-in',
      provider: 'openai-compatible',
      model: 'test-model',
      apiKey: KEY,
      baseUrl: aiUrl,
      dailyLimit: 100,
    });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    conn = saved.body;
    assert.equal(conn.keyHint, 'cdef');
    assert.equal(conn.isDefault, true, 'the first model is the default');
    for (const path of ['/admin/ai/connections', '/admin/settings', '/public/settings']) {
      const res = await call('GET', path);
      assert.ok(!JSON.stringify(res.body).includes(KEY), `${path} does not reveal the key`);
      assert.ok(!JSON.stringify(res.body).includes('apiKeyEnc'), `${path} does not include the encrypted key`);
    }
    const again = await call('PUT', `/admin/ai/connections/${conn.id}`, { model: 'test-model' });
    assert.equal(again.body.keyHint, 'cdef', 'an empty key field keeps the saved key');
    assert.equal((await call('POST', '/admin/ai/connections', { model: 'x', provider: 'anthropic' })).status, 400, 'a key is required');
  });

  test('each model has its own timeout', async () => {
    assert.equal(conn.timeoutSeconds, 600, 'ten minutes unless set');
    const slower = await call('PUT', `/admin/ai/connections/${conn.id}`, { timeoutSeconds: 1200 });
    assert.equal(slower.body.timeoutSeconds, 1200);
    for (const timeoutSeconds of [29, 3601]) {
      assert.equal(
        (await call('PUT', `/admin/ai/connections/${conn.id}`, { timeoutSeconds })).status,
        400,
        `${timeoutSeconds} s is refused`,
      );
    }
    await call('PUT', `/admin/ai/connections/${conn.id}`, { timeoutSeconds: 600 });
  });

  test('an admin can add any model, and choose the default', async () => {
    const second = await call('POST', '/admin/ai/connections', {
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      apiKey: 'sk-ant-other-key-9999',
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.name, 'claude-sonnet-5-5', 'named after the model when no name is given');
    assert.equal(second.body.isDefault, false);
    await call('PUT', `/admin/ai/connections/${second.body.id}`, { isDefault: true });
    let list = (await call('GET', '/admin/ai/connections')).body.connections;
    assert.deepEqual(
      list.filter((c) => c.isDefault).map((c) => c.id),
      [second.body.id],
    );
    assert.equal((await call('DELETE', `/admin/ai/connections/${second.body.id}`)).status, 204);
    list = (await call('GET', '/admin/ai/connections')).body.connections;
    assert.equal(list.find((c) => c.id === conn.id).isDefault, true, 'the other one takes over as default');
  });

  test('test connection uses the saved key and model', async () => {
    const res = await call('POST', `/admin/ai/connections/${conn.id}/test`);
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    const last = requests.at(-1);
    assert.equal(last.auth, `Bearer ${KEY}`);
    assert.equal(last.body.model, 'test-model');
  });

  test('OpenAI: a wrong model name is explained, with the names the key can use', async () => {
    const add = async (model) =>
      (await call('POST', '/admin/ai/connections', { provider: 'openai', model, apiKey: 'sk-proj-openai-1234', baseUrl: aiUrl })).body;
    const test = async (c) => (await call('POST', `/admin/ai/connections/${c.id}/test`)).body;

    const caps = await add('GPT-6');
    assert.equal((await test(caps)).message, 'Use the model name exactly as "gpt-6" (names are case-sensitive).');
    const unknown = await add('gpt-7');
    const said = (await test(unknown)).message;
    assert.match(said, /cannot use a model called "gpt-7"/);
    assert.match(said, /gpt-6, gpt-5/);
    assert.doesNotMatch(said, /embedding/, 'only chat models are suggested');

    // A model with a smaller answer limit: asked again within it.
    const small = await add('small-model');
    assert.equal((await test(small)).ok, true);
    const tries = requests.filter((r) => r.body.model === 'small-model').map((r) => r.body.max_completion_tokens);
    assert.deepEqual(tries.slice(-1), [2000], 'the test asks for a short answer anyway');
    for (const c of [caps, unknown, small]) await call('DELETE', `/admin/ai/connections/${c.id}`);
  });

  test("OpenAI: answers are asked again within a model's smaller limit", async () => {
    const small = (
      await call('POST', '/admin/ai/connections', {
        provider: 'openai',
        model: 'small-model',
        apiKey: 'sk-proj-openai-1234',
        baseUrl: aiUrl,
      })
    ).body;
    const res = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table', connectionId: small.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const tries = requests.filter((r) => r.body.model === 'small-model').map((r) => r.body.max_completion_tokens);
    assert.deepEqual(tries.slice(-2), [32000, 16384]);
    await call('DELETE', `/admin/custom-blocks/${res.body.id}`);
    await call('DELETE', `/admin/ai/connections/${small.id}`);
  });

  test('presets: model lists (free first), and Ollama without a key', async () => {
    const listed = await call('POST', '/admin/ai/connections/models', { provider: 'openrouter', apiKey: 'sk-or-1234', baseUrl: aiUrl });
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const ids = listed.body.models.map((m) => m.id);
    assert.equal(ids[0], 'meta/llama:free', 'free models first');
    assert.ok(listed.body.models[0].free);
    assert.ok(ids.includes('gemini-pro'), 'Gemini\'s "models/" prefix is dropped');
    assert.ok(!ids.includes('text-embedding-3-small') && !ids.includes('image-maker'), 'only text models');
    assert.equal((await call('POST', '/admin/ai/connections/models', { provider: 'groq' })).status, 400, 'a key is needed to list');

    const meta = (await call('GET', '/admin/ai/connections')).body;
    assert.deepEqual(meta.providers, ['anthropic', 'openai', 'openrouter', 'gemini', 'groq', 'gapgpt', 'ollama', 'openai-compatible']);
    assert.equal(meta.presets.gapgpt.baseUrl, 'https://api.gapgpt.app/v1');
    assert.equal(meta.presets.groq.baseUrl, 'https://api.groq.com/openai/v1');

    const local = await call('POST', '/admin/ai/connections', { provider: 'ollama', model: 'qwen-coder', baseUrl: aiUrl });
    assert.equal(local.status, 201, 'Ollama needs no key');
    const before = requests.length;
    assert.equal((await call('POST', `/admin/ai/connections/${local.body.id}/test`)).body.ok, true);
    assert.equal(requests.length, before + 1);
    assert.equal(requests.at(-1).auth, undefined, 'no Authorization header without a key');
    assert.equal(
      (await call('POST', '/admin/ai/connections', { provider: 'openai-compatible', model: 'x', apiKey: 'k' })).status,
      400,
      'a custom service needs its address',
    );
    await call('DELETE', `/admin/ai/connections/${local.body.id}`);
  });

  test("another admin has their own models and cannot use someone else's", async () => {
    const other = await otherAdmin();
    const list = await call('GET', '/admin/ai/connections', undefined, other);
    assert.deepEqual(list.body.connections, [], 'they start with none');
    assert.equal((await call('POST', `/admin/ai/connections/${conn.id}/test`, undefined, other)).status, 404);
    assert.equal((await call('PUT', `/admin/ai/connections/${conn.id}`, { model: 'mine' }, other)).status, 404);
    const res = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table', connectionId: conn.id }, other);
    assert.equal(res.status, 404, "another admin's model cannot be used");
    const none = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table' }, other);
    assert.equal(none.status, 400);
    assert.match(none.body.message, /Connect an AI model/);
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
    assert.equal(block.conversation.at(-1).model, 'Stand-in (test-model)', 'and which model answered');
    assert.match(block.draft.compiled, /export default function \(Vue\)/);
  });

  test('with "Prefer: respond-async" the AI works in the background and the builder asks for the result', async () => {
    const start = async (body, bearer = token) => {
      const res = await fetch(`${API}/admin/custom-blocks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', prefer: 'respond-async', authorization: `Bearer ${bearer}` },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    };
    const result = async (job, bearer = token) => {
      for (;;) {
        const res = await call('GET', `/admin/custom-blocks/jobs/${job}`, undefined, bearer);
        if (res.status !== 200 || res.body.state === 'done') return res;
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    // The first answer fails the checks, so the job reports a fix round.
    answers.push({ summary: 'first try', def_json: '{', source: SOURCE });
    const started = await start({ prompt: 'A pricing table' });
    assert.equal(started.status, 202, JSON.stringify(started.body));
    assert.match(started.body.job, /^[0-9a-f-]{36}$/);
    const other = await otherAdmin();
    assert.equal(
      (await call('GET', `/admin/custom-blocks/jobs/${started.body.job}`, undefined, other)).status,
      404,
      'only its admin sees it',
    );
    const done = await result(started.body.job);
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.match(done.body.block.type, /^ai-price-cards-/);
    assert.deepEqual(
      done.body.steps.map((s) => `${s.kind} ${s.round}`),
      ['asking 1', 'problems 1', 'asking 2'],
      'what the AI did, for the builder to show',
    );
    assert.equal(done.body.steps[1].problems.length, 1);
    assert.match(done.body.steps[1].problems[0], /^def_json is not valid JSON \(/);
    assert.equal(done.body.steps[0].model, 'Stand-in (test-model)');
    assert.equal((await call('GET', `/admin/custom-blocks/${done.body.block.id}`)).body.id, done.body.block.id, 'and it is saved');
    assert.equal((await call('DELETE', `/admin/custom-blocks/${done.body.block.id}`)).status, 204);

    // Errors come back from the job with the status and message the request would have answered with.
    const failing = await start({ prompt: 'A pricing table' }, other);
    assert.equal(failing.status, 202);
    const failed = await result(failing.body.job, other);
    assert.equal(failed.status, 400);
    assert.match(failed.body.message, /Connect an AI model/);
    assert.equal((await call('GET', '/admin/custom-blocks/jobs/00000000-0000-4000-8000-000000000000')).status, 404);
  });

  test('a definition sent as an object or in a code fence is taken as meant; broken JSON is explained', async () => {
    // Models other services serve (e.g. gpt-4o-mini) often answer with the object itself instead of a JSON string.
    answers.push({ summary: 'object', def_json: DEF, source: SOURCE });
    let before = requests.length;
    const asObject = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table' });
    assert.equal(asObject.status, 201, JSON.stringify(asObject.body));
    assert.equal(requests.length - before, 1, 'no fix round needed');
    assert.equal((await call('DELETE', `/admin/custom-blocks/${asObject.body.id}`)).status, 204);

    answers.push({ summary: 'fenced', def_json: '```json\n' + JSON.stringify(DEF) + '\n```', source: SOURCE });
    const fenced = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table' });
    assert.equal(fenced.status, 201, JSON.stringify(fenced.body));
    assert.equal((await call('DELETE', `/admin/custom-blocks/${fenced.body.id}`)).status, 204);

    answers.push({ summary: 'broken', def_json: "{ label: 'Price cards', }", source: SOURCE });
    before = requests.length;
    const fixed = await call('POST', '/admin/custom-blocks', { prompt: 'A pricing table' });
    assert.equal(fixed.status, 201, JSON.stringify(fixed.body));
    const told = requests[before + 1].body.messages.at(-1).content;
    assert.match(told, /def_json is not valid JSON \(.+\)\. It began: \{ label: 'Price cards', \}/, 'the AI is told what is wrong');
    assert.equal((await call('DELETE', `/admin/custom-blocks/${fixed.body.id}`)).status, 204);
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

  test('pictures and files go to the AI with the request; later requests only mention them', async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#00a998' } })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append('prompt', 'Match this design');
    form.append('connectionId', conn.id);
    form.append('files', new Blob([png], { type: 'image/png' }), 'design.png');
    form.append('files', new Blob(['Plans: Basic $5, Pro $19'], { type: 'text/plain' }), 'prices.txt');
    const res = await fetch(`${API}/admin/custom-blocks/${block.id}/refine`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(res.status, 200, await res.clone().text());
    const view = await res.json();
    const sent = requests.at(-1).body.messages.at(-1).content;
    assert.ok(Array.isArray(sent), 'the request carries its files');
    const image = sent.find((p) => p.type === 'image_url');
    assert.match(image.image_url.url, /^data:image\/jpeg;base64,/);
    const { width } = await sharp(Buffer.from(image.image_url.url.split(',')[1], 'base64')).metadata();
    assert.ok(width <= 1568, 'large pictures are scaled down');
    assert.ok(
      sent.some((p) => p.type === 'text' && p.text.includes('Plans: Basic $5')),
      'text files are read',
    );
    assert.ok(sent.some((p) => p.type === 'text' && p.text === 'Match this design'));
    const asked = view.conversation.findLast((m) => m.role === 'user');
    assert.deepEqual(
      asked.attachments.map((a) => [a.name, a.kind]),
      [
        ['design.png', 'image'],
        ['prices.txt', 'text'],
      ],
    );
    assert.match(asked.attachments[0].thumb, /^data:image\/webp;base64,/, 'with a small preview');

    await call('POST', `/admin/custom-blocks/${block.id}/refine`, { prompt: 'Now darker' });
    const history = requests.at(-1).body.messages;
    assert.ok(history.some((m) => typeof m.content === 'string' && m.content.includes('(Attached earlier: design.png, prices.txt.)')));
    assert.ok(
      history.every((m) => typeof m.content === 'string'),
      'earlier files are not sent again',
    );
  });

  test('other files are refused', async () => {
    const form = new FormData();
    form.append('prompt', 'Use this');
    form.append('files', new Blob([Buffer.from('MZ\x90\x00binary')], { type: 'application/octet-stream' }), 'tool.exe');
    const res = await fetch(`${API}/admin/custom-blocks/${block.id}/refine`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /cannot be attached/);
  });

  test('the daily limit is kept, per model', async () => {
    const used = (await call('GET', '/admin/ai/connections')).body.connections.find((c) => c.id === conn.id).usedToday;
    assert.ok(used > 0);
    await call('PUT', `/admin/ai/connections/${conn.id}`, { dailyLimit: used });
    const res = await call('POST', `/admin/custom-blocks/${block.id}/refine`, { prompt: 'Again', connectionId: conn.id });
    assert.equal(res.status, 429);
    await call('PUT', `/admin/ai/connections/${conn.id}`, { dailyLimit: 100 });
  });
});
