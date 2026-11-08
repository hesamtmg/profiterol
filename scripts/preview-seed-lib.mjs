/**
 * What the Aghaj Holding and Setareh Shargh seed scripts share: signing in, making and reaching a preview site, uploading
 * the real photos kept in the repository (see fetch-commons-photos.mjs) with their credits, and publishing pages.
 * It only talks to the admin API, so it works against a local site or a live one.
 *
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD, SITE (the site's address when
 * the installation has several), PREVIEW (fill the preview site /preview/<PREVIEW> instead, made as the owner if it
 * is not there yet), PREVIEW_DAYS (how long a new preview stays online, default 30) and PREVIEW_API (the preview's
 * API address, when it cannot be reached through PREVIEW_URL from where the script runs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export const LOCALES = ['fa', 'en'];

/** sharp comes with the API: next to this file in the repository, or in /app inside the API image. */
export function loadSharp() {
  for (const base of [new URL('../apps/api/package.json', import.meta.url).pathname, '/app/apps/api/package.json']) {
    try {
      return createRequire(base)('sharp');
    } catch {
      // try the next place
    }
  }
  throw new Error('sharp not found: run `npm install` first, or run this inside the API container');
}

/** `t(en, fa)` gives a function of the locale, so content can be written once for both languages. */
export const t = (en, fa) => (l) => (l === 'en' ? en : fa);

/** Persian digits for numbers written into Persian text. */
export const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export async function connect({ name, prospect }) {
  let API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
  const SITE = process.env.SITE ? { 'x-forwarded-host': process.env.SITE } : {};
  const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
  const PREVIEW = (process.env.PREVIEW ?? '').trim().toLowerCase();
  let token = '';

  async function signIn() {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...SITE },
      body: JSON.stringify(ADMIN),
    });
    if (!res.ok) throw new Error(`login failed at ${API} (${res.status}): check API_URL, ADMIN_EMAIL and ADMIN_PASSWORD`);
    token = (await res.json()).token;
  }

  async function api(method, p, body) {
    const res = await fetch(API + p, {
      method,
      headers: { authorization: `Bearer ${token}`, ...SITE, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }

  async function upload(bytes, fileName, type) {
    const fd = new FormData();
    fd.append('file', new Blob([bytes], { type }), fileName);
    const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...SITE }, body: fd });
    if (!res.ok) throw new Error(`upload ${fileName}: ${res.status} ${await res.text()}`);
    return res.json();
  }

  await signIn();
  let previewUrl = '';
  if (PREVIEW) {
    const list = await api('GET', '/admin/sites');
    previewUrl = list.previewUrl;
    if (!previewUrl) throw new Error('This server has no PREVIEW_URL, so it cannot hold preview sites (see DEPLOY.md, "Preview sites")');
    if (!list.sites.some((x) => x.previewSlug === PREVIEW)) {
      await api('POST', '/admin/sites/previews', {
        name,
        slug: PREVIEW,
        template: 'blank',
        days: Number(process.env.PREVIEW_DAYS ?? 30),
        prospect,
      });
      console.log(`Made the preview site /preview/${PREVIEW}`);
    }
    // A preview is served under its path on PREVIEW_URL; nginx (or e2e/proxy.mjs) passes that path on to the API.
    API = (process.env.PREVIEW_API ?? `${previewUrl}/preview/${PREVIEW}/api`).replace(/\/$/, '');
    await signIn();
  }
  return { api, upload, preview: PREVIEW, previewUrl, home: process.argv.includes('--home') || Boolean(PREVIEW) };
}

/**
 * Uploads the photos of `dir` (its credits.json and photos/) into a media folder, each with a description that credits
 * it, and returns `{ url, credits }`: the uploaded address by key, and the credits with those addresses. Photos already
 * in the folder from an earlier run are reused.
 */
export async function uploadPhotos({ api, upload }, dir, folder) {
  const credits = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8'));
  const have = new Map((await api('GET', `/admin/media?folder=${encodeURIComponent(folder)}`)).map((m) => [m.originalName, m.url]));
  const url = {};
  for (const c of credits) {
    const name = `${path.basename(dir)}-${c.key}.jpg`;
    if (!have.has(name)) {
      const media = await upload(fs.readFileSync(path.join(dir, c.file)), name, 'image/jpeg');
      const credit = `${c.author} · ${c.license} · Wikimedia Commons`;
      await api('PATCH', `/admin/media/${media.id}`, { folder, alt: { en: `${c.en}. Photo: ${credit}`, fa: `${c.fa}. عکس: ${credit}` } });
      have.set(name, media.url);
    }
    url[c.key] = have.get(name);
    c.url = url[c.key];
  }
  return { url, credits };
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The blocks of a "Photo credits" page: why the photos are there, a grid linking to Commons, and the full list. */
export function creditBlocks(l, credits, intro) {
  const tr = (en, fa) => (l === 'en' ? en : fa);
  const list = credits
    .map(
      (c) =>
        `<li><strong>${escHtml(l === 'en' ? c.en : c.fa)}</strong>: “${escHtml(c.title)}”, ${escHtml(c.author)}, ` +
        (c.licenseUrl ? `<a href="${escHtml(c.licenseUrl)}">${escHtml(c.license)}</a>` : escHtml(c.license)) +
        `. <a href="${escHtml(c.page)}">${tr('Commons page', 'صفحه در ویکی‌انبار')}</a> · <a href="${escHtml(c.original)}">${tr('original file', 'فایل اصلی')}</a></li>`,
    )
    .join('');
  return [
    { id: 'credits-intro', type: 'text', props: { title: tr('Photo credits', 'اعتبار عکس‌ها'), body: intro(l), align: 'start' } },
    {
      id: 'credits-grid',
      type: 'card-grid',
      props: {
        title: '',
        subtitle: '',
        variant: 'photo',
        columns: '4',
        items: credits.map((c) => ({ image: c.url, title: l === 'en' ? c.en : c.fa, text: `${c.author} · ${c.license}`, link: c.page })),
      },
    },
    {
      id: 'credits-list',
      type: 'rich-text',
      props: { html: `<h2>${tr('Every photo, its author and license', 'همه‌ی عکس‌ها، پدیدآورنده و مجوز')}</h2><ul>${list}</ul>` },
    },
  ];
}

/**
 * Creates or updates a page by its name and publishes it. `home` makes it the home page (a new site has none yet; an
 * existing home page keeps its addresses). `content` is `{ slugs, titles, seo, blocks(l) }`, per locale.
 */
export async function publishPage({ api }, { name, home = false, theme = null, slugs, titles, seo = {}, blocks }) {
  const pages = await api('GET', '/admin/pages');
  let page = home ? pages.find((p) => p.isHome) : pages.find((p) => p.name === name);
  if (home && page) slugs = Object.fromEntries(LOCALES.map((l) => [l, page.translations.find((x) => x.locale === l)?.slug || slugs[l]]));
  page ??= await api('POST', '/admin/pages', { name, ...(home ? { isHome: true } : {}) });
  await api('PATCH', `/admin/pages/${page.id}`, {
    name: home ? page.name : name,
    theme,
    translations: LOCALES.map((l) => ({ locale: l, slug: slugs[l], title: titles[l], ...(seo[l] ?? {}), blocks: blocks(l) })),
  });
  await api('POST', `/admin/pages/${page.id}/publish`);
  console.log(`Published: ${LOCALES.map((l) => `/${l}/${slugs[l]}`).join('  ')}`);
  return slugs;
}
