/**
 * Downloads the Wikimedia Commons photos listed in <dir>/photos.json into <dir>/photos/<key>.jpg (1600 px wide) and
 * writes <dir>/credits.json with each one's author, license, Commons page and original file. Only freely licensed files
 * (CC0, CC BY, CC BY-SA, public domain) are kept.
 *
 *   node scripts/fetch-commons-photos.mjs scripts/aghaj-holding
 *
 * Run it from a machine that can reach Commons, then commit the photos: the seed scripts read them from the repository,
 * so the server never has to download anything (Commons can be slow or blocked from Iran).
 * photos.json maps a key to [Commons file title, what it shows in English, in Persian].
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const UA = 'profiterol-seed/1.0 (https://github.com/hesamtmg/profiterol)';
const API = 'https://commons.wikimedia.org/w/api.php';
const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/fetch-commons-photos.mjs <dir with photos.json>');
const sharp = createRequire(new URL('../apps/api/package.json', import.meta.url).pathname)('sharp');
const list = JSON.parse(fs.readFileSync(path.join(dir, 'photos.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const plain = (html) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60_000) });
    if (res.status === 429) {
      await sleep(5000 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return res;
  }
  throw new Error(`still rate-limited: ${url}`);
}

const titles = Object.values(list).map((v) => v[0]);
const info = {};
for (let i = 0; i < titles.length; i += 40) {
  const u = new URL(API);
  const params = {
    action: 'query',
    format: 'json',
    titles: titles.slice(i, i + 40).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
  };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const data = await (await get(u)).json();
  const back = Object.fromEntries((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of Object.values(data.query?.pages ?? {})) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata ?? {};
    info[back[page.title] ?? page.title] = {
      image: ii.thumburl || ii.url,
      original: ii.url,
      page: ii.descriptionurl,
      author: plain(m.Artist?.value).slice(0, 120) || 'Unknown author',
      license: plain(m.LicenseShortName?.value),
      licenseUrl: m.LicenseUrl?.value ?? '',
    };
  }
}

fs.mkdirSync(path.join(dir, 'photos'), { recursive: true });
const credits = [];
for (const [key, [title, en, fa]] of Object.entries(list)) {
  const meta = info[title];
  if (!meta || !/^(CC0|CC BY|CC-BY|Public domain|PD)/i.test(meta.license)) {
    console.warn(`skipped ${key} (${title}): ${meta ? `license "${meta.license}"` : 'not found'}`);
    continue;
  }
  const file = path.join(dir, 'photos', `${key}.jpg`);
  if (!fs.existsSync(file)) {
    const bytes = Buffer.from(await (await get(meta.image)).arrayBuffer());
    await sharp(bytes)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(file);
    await sleep(400);
  }
  credits.push({ key, title: title.slice(5), en, fa, ...meta, file: `photos/${key}.jpg` });
  console.log(`${key}: ${meta.author} · ${meta.license}`);
}
fs.writeFileSync(path.join(dir, 'credits.json'), `${JSON.stringify(credits, null, 2)}\n`);
console.log(`${credits.length} of ${Object.keys(list).length} photos in ${dir}/photos`);
