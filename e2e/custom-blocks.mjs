// The AI block builder: AI settings, building a block with a stand-in AI service, the sandboxed preview (and that
// draft code there cannot reach the admin), approving, using the block in the editor and on the published page.
import { createServer } from 'node:http';
import { ADMIN, BASE, api, apiToken, check, finish, fixtures, launch, shots, watch } from './lib.mjs';

const out = shots('custom-blocks');

// ---------- A stand-in AI service (OpenAI-compatible), answering with an FAQ block ----------
const DEF = {
  label: 'Toggle list',
  icon: 'mdi-format-list-bulleted',
  description: 'Questions that open to show their answer',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'items',
      label: 'Items',
      type: 'list',
      itemLabel: 'q',
      fields: [
        { key: 'q', label: 'Question', type: 'text' },
        { key: 'a', label: 'Answer', type: 'textarea' },
      ],
    },
  ],
  defaults: {
    title: 'Good to know',
    items: [
      { q: 'Is it fast?', a: 'Very fast.' },
      { q: 'Is it safe?', a: 'Checked and sandboxed.' },
    ],
  },
};
const SOURCE = `<script setup>
import { ref } from 'vue';
defineProps({ p: { type: Object, required: true }, locale: String });
const open = ref(-1);
</script>
<template>
  <section class="toggles">
    <h2 class="title">{{ p.title }}</h2>
    <div v-for="(item, i) in p.items" :key="i" class="item">
      <button type="button" class="q" :aria-expanded="open === i" @click="open = open === i ? -1 : i">{{ item.q }}</button>
      <p v-if="open === i" class="a">{{ item.a }}</p>
    </div>
  </section>
</template>
<style scoped>
.toggles { padding: 2rem; color: var(--c-text); }
.title { font-size: 2rem; font-weight: 800; color: var(--c-primary); }
.item { background: var(--c-surface); border-radius: var(--radius-card); margin-block: .5rem; padding: 1rem; }
.q { font-weight: 700; }
</style>`;
const aiRequests = [];
const ai = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') {
      res.end(JSON.stringify({ data: [{ id: 'big-model' }, { id: 'meta/llama:free' }, { id: 'qwen/coder:free' }] }));
      return;
    }
    aiRequests.push(JSON.parse(raw));
    const answer = { summary: 'A list of questions that open on click.', def_json: JSON.stringify(DEF), source: SOURCE };
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }] }));
  });
});
await new Promise((r) => ai.listen(0, '127.0.0.1', r));

const token = await apiToken();
const browser = await launch();
// The CSP refusals are the sandbox check below (draft code trying to send a request).
const ad = watch(await browser.newPage({ viewport: { width: 1440, height: 1000 } }), /connect-src 'none'|Refused to connect/);
ad.on('dialog', (d) => d.accept());
await ad.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ad.fill('input[type=email]', ADMIN.email);
await ad.fill('input[type=password]', ADMIN.password);
await ad.click('button[type=submit]');
await ad.waitForURL(`${BASE}/admin`);

// ---------- Your AI models (each admin their own, on this site) ----------
await ad.goto(`${BASE}/admin/blocks`, { waitUntil: 'networkidle' });
await ad.waitForSelector('[data-testid="ai-connections"] form');
check('ai models: with none yet, the builder asks to connect one', (await ad.locator('text=Connect an AI model first').count()) === 1);
// A preset: its note, a link for the key, and the provider's own model list (free ones first).
await ad.selectOption('#ai-provider', 'openrouter');
check('presets: OpenRouter says which models are free', (await ad.locator('text=cost nothing').count()) === 1);
check('presets: and where to get a key', (await ad.locator('a[href="https://openrouter.ai/keys"]').count()) === 1);
await ad.fill('#ai-key', 'sk-or-e2e-0000');
await ad.fill('#ai-base', `http://127.0.0.1:${ai.address().port}/v1`);
await ad.click('button:has-text("Load models")');
await ad.waitForSelector('text=3 models found');
const offered = await ad.$$eval('#ai-models option', (os) => os.map((o) => o.value));
check(
  'presets: loaded models, only the free ones while "Free models only" is ticked',
  offered.join() === 'meta/llama:free,qwen/coder:free',
  offered.join(),
);
await ad.selectOption('#ai-provider', 'ollama');
check('presets: Ollama needs no key', (await ad.getAttribute('#ai-key', 'required')) === null);

await ad.selectOption('#ai-provider', 'openai-compatible');
await ad.fill('#ai-model', 'stand-in');
await ad.fill('#ai-name', 'Stand-in');
await ad.fill('#ai-key', 'sk-e2e-secret-key-1234');
await ad.fill('#ai-base', `http://127.0.0.1:${ai.address().port}/v1`);
await ad.locator('[data-testid="ai-connections"]').screenshot({ path: out + 'ai-models-form.png' });
await ad.click('button:has-text("Save model")');
await ad.waitForSelector('text=AI model saved.');
const row = ad.locator('[data-connection="Stand-in"]');
check(
  'ai models: the key is not shown again, only its end',
  (await row.textContent()).includes('…1234') && !(await ad.content()).includes('sk-e2e-secret'),
);
await row.locator('button:has-text("Test")').click();
await ad.waitForSelector('text=the key and model work');
check('ai models: test reaches the AI', true);
await ad.locator('[data-testid="ai-connections"]').screenshot({ path: out + 'ai-models.png' });
await ad.click('button:has-text("Hide your AI models")');

// ---------- Build a block ----------
await ad.fill('#block-prompt', 'A list of questions that open to show the answer');
await ad.click('button:has-text("Build it")');
await ad.waitForSelector('h2:has-text("Toggle list")', { timeout: 20000 });
const frame = ad.frameLocator('iframe[title="Block preview"]');
await frame.locator('h2.title').waitFor({ timeout: 10000 });
check('preview: the draft renders in the sandbox with its defaults', (await frame.locator('h2.title').textContent()) === 'Good to know');
await frame.locator('button.q').first().click();
check('preview: the block is interactive', (await frame.locator('p.a').textContent()) === 'Very fast.');
const color = await frame.locator('h2.title').evaluate((el) => getComputedStyle(el).color);
check('preview: the site theme colors reach the block', color !== 'rgb(0, 0, 0)' && color !== '', color);
await ad.fill('input[id] >> nth=0', 'Frequently asked').catch(() => undefined);
const titleInput = ad.locator('details input').first();
await titleInput.fill('Frequently asked');
await ad.waitForTimeout(300);
check('preview: trying the fields updates the preview', (await frame.locator('h2.title').textContent()) === 'Frequently asked');
await ad.screenshot({ path: out + 'builder.png', fullPage: true });

// The sandbox: no origin of its own (no cookies, no reaching the admin) and no network requests.
const sandboxed = await ad.evaluate(() => {
  const f = document.querySelector('iframe[title="Block preview"]');
  try {
    return f.contentWindow.document ? 'reachable' : 'unreachable';
  } catch {
    return 'unreachable';
  }
});
check('sandbox: the admin page and the preview cannot reach each other', sandboxed === 'unreachable');
const probe = `export const css = '';
export default function (Vue) {
  return { setup() {
    const r = Vue.ref('pending');
    let cookie = 'none';
    try { cookie = document.cookie; } catch { cookie = 'denied'; }
    globalThis['fe' + 'tch']('/api/admin/pages').then(() => (r.value = 'LEAK ' + cookie), () => (r.value = 'blocked ' + cookie));
    return () => Vue.h('p', { id: 'probe' }, r.value);
  } };
}`;
await ad.evaluate((code) => {
  document
    .querySelector('iframe[title="Block preview"]')
    .contentWindow.postMessage({ target: 'profiterol-block-sandbox', code, props: {} }, '*');
}, probe);
await frame
  .locator('#probe:not(:has-text("pending"))')
  .waitFor({ timeout: 5000 })
  .catch(() => undefined);
const probed = await frame
  .locator('#probe')
  .textContent()
  .catch(() => 'missing');
check('sandbox: draft code cannot send requests or read cookies', probed === 'blocked denied', probed);
await ad.reload({ waitUntil: 'networkidle' });

// ---------- Attach a picture to a request ----------
await ad.setInputFiles('[data-testid="ai-attach-input"]', fixtures.cover);
check('attach: the picture waits as a chip with a preview', (await ad.locator('[data-testid="ai-attachment"] img').count()) === 1);
await ad.fill('textarea[aria-label="Ask for changes"]', 'Use the colors of this picture');
await ad.click('aside button:has-text("Send")');
await ad.waitForSelector('aside li img[src^="data:image/webp"]', { timeout: 20000 });
check('attach: the conversation shows what was attached', (await ad.locator('aside li >> text=cover-harbor.png').count()) === 1);
check('attach: the chip is cleared after sending', (await ad.locator('[data-testid="ai-attachment"]').count()) === 0);
const aiSaw = aiRequests.at(-1).messages.at(-1).content;
check('attach: the picture reaches the AI', Array.isArray(aiSaw) && aiSaw.some((p) => p.type === 'image_url'));
await ad.locator('aside:has-text("Ask for changes")').screenshot({ path: out + 'conversation-with-picture.png' });

// ---------- Approve, then use it in the editor ----------
await ad.click('button:has-text("Approve for use")');
await ad.waitForSelector('text=In use');
check('approve: the owner approves the block', true);
const blocks = await api(token, 'GET', '/admin/custom-blocks');
const block = blocks.find((b) => b.label === 'Toggle list');

const page = await api(token, 'POST', '/admin/pages', { name: `AI blocks ${Date.now()}` });
await ad.goto(`${BASE}/admin/pages/${page.id}`, { waitUntil: 'networkidle' });
const tile = ad.locator(`[data-type="${block.type}"]`);
check('editor: the approved block is in the block library', (await tile.count()) === 1);
await tile.click();
await ad.locator('main h2.title').first().waitFor({ timeout: 10000 });
check('editor: the block renders in the canvas', (await ad.locator('main h2.title').first().textContent()) === 'Good to know');
await ad.waitForSelector('text=/Saved \\d/', { timeout: 15000 }).catch(() => undefined); // autosave
const saved = await api(token, 'GET', `/admin/pages/${page.id}`);
// The editor opens on the site's first language; the block went into that translation.
const tr = saved.translations.find((t) => t.blocks.some((b) => b.type === block.type));
check('editor: the page saves with the custom block', Boolean(tr));
await api(token, 'POST', `/admin/pages/${page.id}/publish`);

// ---------- The published page ----------
const site = watch(await browser.newPage({ viewport: { width: 1280, height: 900 } }));
await site.goto(`${BASE}/${tr.locale}/${tr.slug}`, { waitUntil: 'networkidle' });
await site.locator('h2.title').waitFor({ timeout: 10000 });
check('site: visitors see the custom block', (await site.locator('h2.title').textContent()) === 'Good to know');
await site.locator('button.q').nth(1).click();
check('site: and it works', (await site.locator('p.a').textContent()) === 'Checked and sandboxed.');
await site.screenshot({ path: out + 'site.png', fullPage: true });

// Disabled: the page shows nothing in its place.
await api(token, 'POST', `/admin/custom-blocks/${block.id}/disable`);
await site.goto(`${BASE}/${tr.locale}/${tr.slug}?v=2`, { waitUntil: 'networkidle' });
check('site: a disabled block is not shown', (await site.locator('h2.title').count()) === 0);
await api(token, 'POST', `/admin/custom-blocks/${block.id}/enable`);

await browser.close();
ai.close();
finish();
