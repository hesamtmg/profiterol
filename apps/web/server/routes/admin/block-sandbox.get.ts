/**
 * The AI block builder's preview frame (components/admin/CustomBlockPreview.vue). Drafts are code nobody has approved
 * yet, so they only ever run here: a sandboxed document with no origin of its own (no access to the admin's cookies,
 * storage or pages), no network requests (connect-src 'none') and no navigation of the admin. The admin sends the
 * compiled draft, its props and the site's styles with postMessage; this page renders it and reports its height and
 * any error. Vue itself comes the same way (the admin fetches it from the API), so the frame loads nothing.
 */
const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; background: var(--c-background, #fff); color: var(--c-text, #111); }
  #app { container-type: inline-size; }
  .sandbox-error { margin: 1rem; padding: 1rem; border-radius: .75rem; background: #fef2f2; color: #991b1b; font: 13px/1.5 ui-monospace, monospace; white-space: pre-wrap; }
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
let Vue = null;
let state = null;
let app = null;
let blobUrl = '';
const send = (msg) => parent.postMessage({ source: 'profiterol-block-sandbox', ...msg }, '*');
const showError = (message) => {
  send({ type: 'error', message: String(message) });
  if (app) app.unmount();
  app = null;
  document.getElementById('app').innerHTML = '';
  const box = document.createElement('div');
  box.className = 'sandbox-error';
  box.textContent = String(message);
  document.getElementById('app').appendChild(box);
};
window.addEventListener('error', (e) => showError(e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason?.message ?? e.reason));
const root = document.getElementById('app');
new ResizeObserver(() => send({ type: 'height', value: root.scrollHeight })).observe(root);

let current = '';
const moduleUrl = (code) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));

function setStyles(styles) {
  document.querySelectorAll('[data-site-style]').forEach((el) => el.remove());
  for (const s of styles.links ?? []) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = s;
    link.dataset.siteStyle = '';
    document.head.appendChild(link);
  }
  for (const text of styles.inline ?? []) {
    const style = document.createElement('style');
    style.dataset.siteStyle = '';
    style.textContent = text;
    document.head.appendChild(style);
  }
}

// One message at a time, in order: the first one loads Vue before anything can render.
let queue = Promise.resolve();
window.addEventListener('message', (e) => {
  if (e.source !== parent || !e.data || e.data.target !== 'profiterol-block-sandbox') return;
  queue = queue.then(() => handle(e.data));
});

async function handle(msg) {
  if (!Vue) {
    if (!msg.vue) return;
    Vue = await import(moduleUrl(msg.vue));
    state = Vue.reactive({ p: {}, locale: 'en' });
  }
  if (msg.styles) setStyles(msg.styles);
  if (msg.dir) document.documentElement.dir = msg.dir;
  state.p = msg.props ?? {};
  state.locale = msg.locale ?? 'en';
  if (!msg.code || msg.code === current) return;
  current = msg.code;
  try {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = moduleUrl(msg.code);
    const mod = await import(blobUrl);
    document.getElementById('block-css')?.remove();
    const css = document.createElement('style');
    css.id = 'block-css';
    css.textContent = mod.css ?? '';
    document.head.appendChild(css);
    const component = mod.default(Vue);
    if (app) app.unmount();
    document.getElementById('app').innerHTML = '';
    app = Vue.createApp({ render: () => Vue.h(component, { p: state.p, locale: state.locale }) });
    app.config.errorHandler = (err) => showError(err?.message ?? err);
    app.mount('#app');
    send({ type: 'rendered' });
  } catch (err) {
    showError(err?.message ?? err);
  }
}
send({ type: 'ready' });
</script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    // `sandbox` keeps the frame without an origin even if this address is opened directly.
    'Content-Security-Policy': [
      'sandbox allow-scripts',
      "default-src 'none'",
      "script-src blob: 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'none'",
      "frame-ancestors 'self'",
    ].join('; '),
  });
  return html;
});
