#!/usr/bin/env node
/**
 * Imports a minicms site into Profiterol: pages and their sections (the 12 minicms kinds become the matching
 * classic blocks, in Persian and English), posts into the Blog collection, projects into Projects, the pictures
 * and videos they use, and redirects from every old minicms address to its new one.
 *
 *   npm run import:minicms -- dump.sql --uploads /path/to/minicms/public/uploads [--publish] [--dry-run]
 *
 * dump.sql is a MySQL dump of the minicms database (mysqldump or Navicat). Profiterol must be running; the script
 * signs in as ADMIN_EMAIL / ADMIN_PASSWORD at API_URL (default http://localhost:3001/api). Pages that already
 * exist (same English address) are skipped, so it can be run again after fixing something.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

// ---------- Arguments ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dumpPath = args.find((a, i) => !a.startsWith('--') && !['--uploads', '--api'].includes(args[i - 1]));
if (!dumpPath || flag('help')) {
  console.log('Usage: npm run import:minicms -- dump.sql [--uploads DIR] [--publish] [--dry-run] [--api URL]');
  process.exit(dumpPath ? 0 : 1);
}
const API = (option('api') ?? process.env.API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
const UPLOADS = option('uploads');
const PUBLISH = flag('publish');
const DRY = flag('dry-run');

// ---------- Reading the dump ----------

/** Splits one VALUES list, e.g. `(1,'a\'b',NULL),(2,'c',3)`, into rows of JavaScript values. */
export function parseValues(text) {
  const rows = [];
  let row = null;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '(' && !row) {
      row = [];
      i++;
    } else if (c === ')' && row) {
      rows.push(row);
      row = null;
      i++;
    } else if (c === "'" && row) {
      let value = '';
      i++;
      while (i < text.length) {
        const ch = text[i];
        if (ch === '\\') {
          const next = text[i + 1];
          value += { n: '\n', r: '\r', t: '\t', 0: '\0', Z: '\x1a' }[next] ?? next;
          i += 2;
        } else if (ch === "'" && text[i + 1] === "'") {
          value += "'";
          i += 2;
        } else if (ch === "'") {
          i++;
          break;
        } else {
          value += ch;
          i++;
        }
      }
      row.push(value);
    } else if (row && c !== ',' && !/\s/.test(c)) {
      let j = i;
      while (j < text.length && text[j] !== ',' && text[j] !== ')') j++;
      const token = text.slice(i, j).trim();
      row.push(token === 'NULL' ? null : Number.isNaN(Number(token)) ? token : Number(token));
      i = j;
    } else i++;
  }
  return rows;
}

/** Every INSERT in the dump, as rows keyed by column name, per table. */
export function readDump(sql) {
  const tables = {};
  const columnsOf = {};
  for (const m of sql.matchAll(/CREATE TABLE `(\w+)` \(([\s\S]*?)\n\)/g)) {
    columnsOf[m[1]] = [...m[2].matchAll(/^\s*`(\w+)`/gm)].map((c) => c[1]);
  }
  const insert = /INSERT INTO `(\w+)`(?: \(([^)]*)\))? VALUES /g;
  let m;
  while ((m = insert.exec(sql))) {
    const table = m[1];
    const columns = m[2] ? m[2].split(',').map((c) => c.trim().replace(/`/g, '')) : columnsOf[table];
    // The statement ends at the first `;` outside a quoted string.
    let i = insert.lastIndex;
    let quoted = false;
    for (; i < sql.length; i++) {
      if (sql[i] === '\\' && quoted) i++;
      else if (sql[i] === "'") quoted = !quoted;
      else if (sql[i] === ';' && !quoted) break;
    }
    const rows = parseValues(sql.slice(insert.lastIndex, i));
    insert.lastIndex = i;
    if (!columns) continue;
    (tables[table] ??= []).push(...rows.map((r) => Object.fromEntries(columns.map((c, k) => [c, r[k]]))));
  }
  return tables;
}

// ---------- Text ----------

const ENTITIES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', zwnj: '‌', rlm: '', lrm: '' };

/** minicms keeps editor HTML in plain text fields; Profiterol's are plain text. */
export function htmlToText(html) {
  if (html === null || html === undefined) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (all, e) =>
      e[0] === '#'
        ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
        : (ENTITIES[e.toLowerCase()] ?? all),
    )
    .replace(/[ \t\u00a0]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Same rule as the API: letters of any script, digits and dashes. */
export function slugify(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}‌]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const json = (text) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

/**
 * A field of a section in one language. Persian is in `content` under the plain key; English is in `content_en`
 * with `_en` added (before a trailing `_2`). Pictures and links are the same in both.
 */
function reader(detail) {
  const fa = json(detail.content);
  const en = { ...fa, ...json(detail.content_en) };
  return (locale) => (key) => {
    if (locale === 'fa') return fa[key] ?? null;
    const enKey = /_2$/.test(key) ? key.replace(/_2$/, '_en_2') : `${key}_en`;
    return en[enKey] ?? en[key] ?? fa[key] ?? null;
  };
}

// ---------- API ----------

let token = '';
async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

// ---------- Media ----------

const MEDIA_EXT = /\.(jpe?g|png|webp|gif|avif|mp4|webm)$/i;
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const uploaded = new Map();
const missing = new Set();

/** A minicms file path (e.g. images/pages/x.jpg) as a Profiterol upload URL; '' when it cannot be found. */
async function media(path) {
  if (!path || typeof path !== 'string' || !MEDIA_EXT.test(path)) return '';
  const clean = path.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/?(public\/)?(uploads\/)?/, '');
  if (uploaded.has(clean)) return uploaded.get(clean);
  const file = UPLOADS && [join(UPLOADS, clean), join(UPLOADS, 'uploads', clean)].find((p) => existsSync(p));
  if (!file) {
    missing.add(clean);
    uploaded.set(clean, '');
    return '';
  }
  if (DRY) {
    uploaded.set(clean, `/uploads/(${basename(clean)})`);
    return uploaded.get(clean);
  }
  const fd = new FormData();
  fd.append(
    'file',
    new Blob([readFileSync(file)], { type: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' }),
    basename(file),
  );
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd });
  const url = res.ok ? (await res.json()).url : '';
  if (!url) missing.add(`${clean} (refused: ${res.status})`);
  uploaded.set(clean, url);
  return url;
}

// ---------- Sections → blocks ----------

let nextId = 0;
const id = () => `mc${Date.now().toString(36)}${(nextId++).toString(36)}`;
const GRID_SIZES = ['1*3', '1*4', '2*2', '2*3', '2*4', '3*3', '3*4', '4*4'];
const GRID_MOBILE = ['2*1', '3*1', '2*2', '3*2', '4*2', '6*2'];

/** One minicms section as a Profiterol block in one language (null for kinds without a match). */
export async function sectionToBlock(detail, locale) {
  const get = reader(detail)(locale);
  const t = (key) => htmlToText(get(key));
  const block = (type, props) => ({ id: `${id()}${locale}`, type, props });
  switch (String(detail.kind)) {
    case '1':
      return block('video-cover', {
        video: await media(get('video_file')),
        mobileVideo: await media(get('video_file_mobile')),
        poster: '',
        title: [t('video_title'), t('video_discription')].filter(Boolean).join('\n'),
      });
    case '2':
      return block('triple', {
        title: t('triple_title'),
        items: await Promise.all(
          [1, 2, 3].map(async (n) => ({
            image: await media(get(`triple_${n}_img`)),
            mobileImage: await media(get(`triple_${n}_img_mobile`)),
            title: t(`triple_${n}_name`),
            text: t(`triple_${n}_description`),
            link: String(get(`triple_${n}_url`) ?? ''),
          })),
        ),
      });
    case '3':
      return block('horizon', {
        image: await media(get('horizon_1_img')),
        mobileImage: await media(get('horizon_1_img_mobile')),
        title: t('horizon_title'),
        text: t('horizon_description'),
      });
    case '4':
      return block('side-by-side', {
        image: await media(get('side_side_1_img')),
        mobileImage: await media(get('side_side_1_img_mobile')),
        bigTitle: t('side_side_big_title'),
        smallTitle: t('side_side_title'),
        lines: ['first', 'second', 'third'].map((n) => ({ text: t(`side_side_${n}_lines`) })).filter((l) => l.text),
        buttonLabel: t('side_side_btn_name'),
        buttonLink: String(get('side_side_btn_url') ?? ''),
      });
    case '5':
    case '6': {
      const side = String(detail.kind) === '5' ? 'right' : 'left';
      return block(`horizon-${side}`, {
        image: await media(get(`horizon_${side}_1_img`)),
        mobileImage: await media(get(`horizon_${side}_1_img_mobile`)),
        title: t(`horizon_${side}_title`),
        text: t(`horizon_${side}_description`),
      });
    }
    case '7':
      return block('contact-split', {
        image: await media(get('contact_form_1_img')),
        title: t('contact_form_title'),
        text: [t('contact_form_description'), t('contact_form_description_2')].filter(Boolean).join('\n\n'),
        email: String(get('contact_form_email') ?? ''),
      });
    case '8':
      return block('information', {
        image: await media(get('information_1_img')),
        title: t('information_title'),
        text: t('information_description'),
        title2: t('information_title_2'),
        subtitle2: t('information_description_2'),
        body: ['first', 'second', 'third']
          .map((n) => t(`information_${n}_lines`))
          .filter(Boolean)
          .join('\n\n'),
      });
    case '9':
      return block('rich-text', { html: String(get('editor_form_title') ?? '') });
    case '10':
      return block('video-showcase', {
        video: await media(get('video_player_file')),
        poster: await media(get('video_player_poster')),
        mobileVideo: await media(get('video_player_file_mobile')),
        mobilePoster: await media(get('video_player_poster_mobile')),
      });
    case '11': {
      const list = get(locale === 'en' ? 'carousel_en' : 'carousel') ?? get('carousel') ?? [];
      return block('slider', {
        slides: await Promise.all(
          (Array.isArray(list) ? list : Object.values(list)).map(async (s) => ({
            image: await media(s.image),
            mobileImage: await media(s.imagem),
            title: htmlToText([s.title, s.description].filter(Boolean).join('\n')),
            buttonLabel: htmlToText(s.btn_title),
            buttonLink: String(s.btn_link ?? ''),
          })),
        ),
      });
    }
    case '12': {
      const list = get(locale === 'en' ? 'grid_en' : 'grid') ?? get('grid') ?? [];
      const size = String(get('grid_size') ?? '');
      const mobileSize = String(get('grid_size_mobile') ?? '');
      return block('photo-grid', {
        ...(GRID_SIZES.includes(size) ? { size } : {}),
        ...(GRID_MOBILE.includes(mobileSize) ? { mobileSize } : {}),
        items: await Promise.all(
          (Array.isArray(list) ? list : Object.values(list)).map(async (g) => ({
            image: await media(g.image),
            title: htmlToText(g.title),
            text: htmlToText(g.description),
            link: String(g.btn_link ?? ''),
          })),
        ),
      });
    }
    default:
      return null;
  }
}

// ---------- The import ----------

async function main() {
  const tables = readDump(readFileSync(dumpPath, 'utf8'));
  const details = tables.page_details ?? [];
  // Some minicms dumps hold only page_details; their pages are then named by number.
  const pages =
    tables.pages ??
    [...new Set(details.map((d) => d.page_id))].map((pid) => ({ id: pid, name: `minicms page ${pid}`, slug_en: `page-${pid}` }));
  const summary = { pages: 0, skippedPages: [], skippedItems: [], blocks: 0, unknownKinds: new Set(), items: 0, redirects: [] };

  if (!DRY) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' }),
    });
    if (!res.ok) throw new Error(`Could not sign in at ${API} (${res.status}); set API_URL, ADMIN_EMAIL and ADMIN_PASSWORD`);
    token = (await res.json()).token;
  }
  const existing = DRY ? [] : await call('GET', '/admin/pages');
  const takenEn = new Set(existing.flatMap((p) => p.translations.filter((t) => t.locale === 'en').map((t) => t.slug)));

  for (const page of pages) {
    const sections = details.filter((d) => d.page_id === page.id).sort((a, b) => Number(a.sort) - Number(b.sort));
    const nameFa = htmlToText(page.name) || `minicms page ${page.id}`;
    const nameEn = htmlToText(page.name_en) || nameFa;
    const slugEn = slugify(page.slug_en || nameEn) || `page-${page.id}`;
    const slugFa = slugify(page.slug || nameFa) || slugEn;
    const translations = [];
    for (const [locale, title, slug, seoTitle, seoDescription] of [
      ['fa', nameFa, slugFa, page.meta_title, page.meta_description],
      ['en', nameEn, slugEn, page.meta_title_en, page.meta_description_en],
    ]) {
      const blocks = [];
      for (const s of sections) {
        const b = await sectionToBlock(s, locale);
        if (b) blocks.push(b);
        else summary.unknownKinds.add(String(s.kind));
      }
      translations.push({
        locale,
        title,
        slug,
        seoTitle: htmlToText(seoTitle).slice(0, 200),
        seoDescription: htmlToText(seoDescription).slice(0, 500),
        blocks,
      });
    }
    summary.blocks += translations[0].blocks.length;
    const oldPaths = [...new Set([page.slug_en, page.slug].filter(Boolean).map((s) => `/page/${s}`))];

    if (takenEn.has(slugEn)) {
      summary.skippedPages.push(nameEn);
      continue;
    }
    if (!DRY) {
      const created = await call('POST', '/admin/pages', { name: nameEn });
      const saved = await call('PATCH', `/admin/pages/${created.id}`, { translations });
      if (PUBLISH) await call('POST', `/admin/pages/${created.id}/publish`);
      const fa = saved.translations.find((t) => t.locale === 'fa');
      summary.redirects.push(...oldPaths.map((from) => ({ from, to: `/fa/${fa.slug}` })));
    }
    summary.pages++;
  }

  // Posts → Blog, projects → Projects (when those collections exist).
  const collections = DRY ? [] : await call('GET', '/admin/collections');
  const into = async (key, rows, toItem, oldPrefixes) => {
    const collection = collections.find((c) => c.key === key);
    if (!collection || !rows?.length) return;
    const have = new Set(
      (await call('GET', `/admin/collections/${collection.id}/items`)).flatMap((i) => (i.translations ?? []).map((t) => t.slug)),
    );
    for (const row of rows) {
      const item = toItem(row);
      if (have.has(slugify(row.slug || item.title))) {
        summary.skippedItems.push(item.title);
        continue;
      }
      const created = await call('POST', `/admin/collections/${collection.id}/items`, { title: item.title });
      const slug = slugify(row.slug || item.title);
      const cover = await media(row.image);
      await call('PATCH', `/admin/collections/${collection.id}/items/${created.id}`, {
        cover,
        translations: ['fa', 'en'].map((locale) => ({
          locale,
          title: item.title,
          slug,
          excerpt: item.excerpt,
          body: item.body,
          tags: item.tags,
          data: item.data ?? {},
        })),
      });
      if (PUBLISH) await call('POST', `/admin/collections/${collection.id}/items/${created.id}/publish`);
      summary.items++;
      for (const prefix of oldPrefixes)
        summary.redirects.push({ from: `/${prefix}/${row.slug}`, to: `/fa/${collection.slugs.fa}/${slug}` });
    }
    for (const prefix of oldPrefixes) summary.redirects.push({ from: `/${prefix}`, to: `/fa/${collection.slugs.fa}` });
  };
  const tags = (text) =>
    String(text ?? '')
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  if (!DRY) {
    await into(
      'blog',
      tables.posts,
      (p) => ({
        title: htmlToText(p.title),
        excerpt: htmlToText(p.shortDescription).slice(0, 1000),
        body: String(p.description ?? ''),
        tags: tags(p.tags),
      }),
      ['post', 'blog', 'posts'],
    );
    await into(
      'projects',
      tables.projects,
      (p) => ({
        title: htmlToText(p.title),
        excerpt: htmlToText(p.metaDescription).slice(0, 1000),
        body: String(p.description ?? ''),
        tags: tags(p.tags || p.category),
        data: { client: htmlToText(p.client) },
      }),
      ['projects'],
    );
    if (summary.redirects.length) {
      const res = await call('POST', '/admin/redirects/bulk', { redirects: summary.redirects });
      summary.redirectsAdded = res.added;
    }
  }

  console.log(
    `${DRY ? '[dry run] ' : ''}Imported ${summary.pages} page(s) with ${summary.blocks} section(s), ${summary.items} collection item(s), ${uploaded.size - missing.size} file(s), ${summary.redirectsAdded ?? 0} redirect(s).`,
  );
  if (summary.skippedPages.length) console.log(`Skipped (already there): ${summary.skippedPages.join(', ')}`);
  if (summary.skippedItems.length) console.log(`Skipped items (already there): ${summary.skippedItems.join(', ')}`);
  if (summary.unknownKinds.size) console.log(`Sections of unknown kinds left out: ${[...summary.unknownKinds].join(', ')}`);
  if (missing.size)
    console.log(
      `Files not found${UPLOADS ? '' : ' (pass --uploads)'}: ${[...missing].slice(0, 20).join(', ')}${missing.size > 20 ? ` and ${missing.size - 20} more` : ''}`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
