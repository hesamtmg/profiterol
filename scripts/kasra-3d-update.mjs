/**
 * Adds the 3D pieces to Kasra's live site without touching anything else on it. Unlike seed-kasra.mjs, it rebuilds
 * nothing: every page, text, picture, menu, logo, colour and setting stays as it is. It only:
 *
 *   loader   turns the page loader into the "3D planets" style, with the NFT planet pictures already in the media
 *            library (the loader's other settings, such as its text and colours, are kept);
 *   hero     shows the 3D animals under the headline of the home page's aurora hero (its text and buttons are kept);
 *   jungle   adds a "3D scroll journey" section through a jungle, past the animals, to the home page;
 *   galaxy   adds a "3D scroll journey" section through a galaxy, past the planets, to the home page. It takes the
 *            place of the old "A small solar system" orbit section if there is one, else it goes before the counters
 *            (or before the last section).
 *
 * The eight animal cut-outs (scripts/kasra-animals/) are uploaded to the media folder "Kasra · 3D animals"; nothing
 * else is uploaded. Running it again updates the same sections instead of adding more.
 *
 * The home page is saved as a new version (Admin → page history can restore the one before). It is published only
 * when the page had no unpublished changes of its own; otherwise it is left as a draft for you to check and publish,
 * so your work in progress never goes live by accident.
 *
 *   node scripts/kasra-3d-update.mjs --dry-run          show what would change, change nothing
 *   node scripts/kasra-3d-update.mjs                    do it all
 *   node scripts/kasra-3d-update.mjs --only=loader,hero only some of: loader, hero, jungle, galaxy
 *
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD, SITE (the site's address, when
 * the installation has several sites, e.g. SITE=kasradesignstudio.com).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const ONLY = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? 'loader,hero,jungle,galaxy').split(',').map((s) => s.trim());
const wants = (part) => ONLY.includes(part);
const API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const SITE = process.env.SITE ? { 'x-forwarded-host': process.env.SITE } : {};
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const ANIMALS_DIR = new URL('./kasra-animals/', import.meta.url).pathname;
const t = (en, fa) => (l) => (l === 'fa' ? fa : en);

let token = '';
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...SITE, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const say = (s) => console.log(`${DRY ? '[dry run] ' : ''}${s}`);

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...SITE },
  body: JSON.stringify(ADMIN),
});
if (!login.ok) throw new Error(`login failed (${login.status}): check API_URL, ADMIN_EMAIL, ADMIN_PASSWORD and SITE`);
token = (await login.json()).token;

// ---------- Pictures ----------
const media = await api('GET', '/admin/media');
const planetFiles = media
  .filter((m) => /^Planet\s.*\.(jpe?g|png)$/i.test(m.originalName))
  .sort((a, b) => a.originalName.localeCompare(b.originalName, 'en', { numeric: true }));
// The same picture may be in the library twice; keep one per name.
const planetPics = [...new Map(planetFiles.map((m) => [m.originalName, m])).values()];
const planetName = (file, l) => {
  const code = file
    .replace(/\.[a-z]+$/i, '')
    .replace(/^Planet\s+/, '')
    .replace(/-01$/, '')
    .trim();
  return l === 'fa' ? `سیاره‌ی ${code}` : `Planet ${code}`;
};
const planets = (l) => planetPics.map((m) => ({ image: m.url, name: planetName(m.originalName, l) }));
if ((wants('loader') || wants('galaxy')) && !planetPics.length) throw new Error('No "Planet …" pictures in the media library');
say(`Planets found in the media library: ${planetPics.length}`);

const ANIMALS = [
  // name, height next to the others, looks right in its picture, flies, English, Persian
  ['tiger', 0.62, true, false, 'Tiger', 'ببر'],
  ['bear', 1, true, false, 'Bear', 'خرس'],
  ['wolf', 0.55, false, false, 'Wolf', 'گرگ'],
  ['bull', 0.7, false, false, 'Bull', 'گاو نر'],
  ['unicorn', 0.95, false, false, 'Unicorn', 'تک‌شاخ'],
  ['mammoth', 1.2, false, false, 'Mammoth', 'ماموت'],
  ['rhino', 0.78, false, false, 'Rhino', 'کرگدن'],
  ['owl', 0.5, false, true, 'Owl', 'جغد'],
];
const cutOuts = {};
if (wants('hero') || wants('jungle')) {
  const FOLDER = 'Kasra · 3D animals';
  const have = new Map(media.filter((m) => m.folder === FOLDER).map((m) => [m.originalName, m.url]));
  for (const [name] of ANIMALS) {
    const file = `${name}-cut-out.webp`;
    if (have.has(file)) cutOuts[name] = have.get(file);
    else if (DRY) cutOuts[name] = `/uploads/dry-run/${file}`;
    else {
      const fd = new FormData();
      fd.append('file', new Blob([readFileSync(join(ANIMALS_DIR, `${name}.webp`))], { type: 'image/webp' }), file);
      const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...SITE }, body: fd });
      if (!res.ok) throw new Error(`upload ${file}: ${res.status} ${await res.text()}`);
      const m = await res.json();
      await api('PATCH', `/admin/media/${m.id}`, { folder: FOLDER });
      cutOuts[name] = m.url;
    }
  }
  say(`Animal cut-outs ready: ${Object.keys(cutOuts).length} (in "${FOLDER}")`);
}
const heroAnimals = ANIMALS.map(([name, size, , flies]) => ({ image: cutOuts[name], size, flip: name === 'wolf', flies }));
const journeyAnimals = (l) =>
  ANIMALS.map(([name, size, right, flies, en, fa]) => ({
    image: cutOuts[name],
    name: l === 'fa' ? fa : en,
    size,
    faces: right ? 'right' : 'left',
    flies,
  }));

// ---------- The loader ----------
if (wants('loader')) {
  const settings = await api('GET', '/admin/settings');
  const loader = {
    ...settings.loader,
    enabled: true,
    style: 'planets',
    planets: planetPics.slice(0, 8).map((m) => m.url),
    planetFill: 62,
    minSeconds: Math.max(Number(settings.loader?.minSeconds) || 0, 3),
  };
  say(`Loader: ${settings.loader?.enabled ? settings.loader.style : 'off'} → 3D planets (its text, colours and other settings kept)`);
  if (!DRY) await api('PUT', '/admin/settings', { loader });
}

// ---------- The home page ----------
if (wants('hero') || wants('jungle') || wants('galaxy')) {
  const list = await api('GET', '/admin/pages');
  const homeId = list.find((p) => p.isHome)?.id;
  if (!homeId) throw new Error('This site has no home page');
  const page = await api('GET', `/admin/pages/${homeId}`);
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const hadDraft = page.status !== 'published' || page.translations.some((tr) => !same(tr.blocks, tr.publishedBlocks));

  const lowPolySlug = list.find((p) => /low.?poly/i.test(p.name))?.translations?.find((x) => x.locale === 'en')?.slug;
  const nftSlug = list.find((p) => /^nft$/i.test(p.name))?.translations?.find((x) => x.locale === 'en')?.slug;
  const jungle = (l, old) => ({
    id: old?.id ?? 'jungle',
    type: 'cosmos-3d',
    props: {
      eyebrow: t('Low poly animals', 'حیوانات لوپلی')(l),
      title: t('Into the jungle', 'به دل جنگل')(l),
      text: t('Scroll down the path to meet Kasra’s animals one by one.', 'در مسیر اسکرول کنید تا حیوانات کسری را یکی‌یکی ببینید.')(l),
      buttonLabel: t('See the low poly work', 'دیدن کارهای لوپلی')(l),
      buttonLink: lowPolySlug ?? 'low-poly',
      scene: 'jungle',
      planets: [],
      animals: journeyAnimals(l),
      fill: 62,
      // A section you already edited keeps your words.
      ...(old
        ? {
            eyebrow: old.props.eyebrow,
            title: old.props.title,
            text: old.props.text,
            buttonLabel: old.props.buttonLabel,
            buttonLink: old.props.buttonLink,
          }
        : {}),
    },
  });
  const galaxy = (l, old) => ({
    id: old?.type === 'cosmos-3d' ? old.id : 'galaxy',
    type: 'cosmos-3d',
    props: {
      eyebrow: t('NFT', 'ان‌اف‌تی')(l),
      title: t('A trip through the galaxy', 'سفری میان کهکشان')(l),
      text: t('Eight imaginary planets, each with a code name and a year.', 'هشت سیاره‌ی خیالی، هر کدام با یک رمز و یک سال.')(l),
      buttonLabel: t('See every NFT', 'دیدن همه‌ی ان‌اف‌تی‌ها')(l),
      buttonLink: nftSlug ?? 'nft',
      scene: 'galaxy',
      planets: planets(l),
      animals: [],
      fill: 62,
      // Keep the words of a section you already edited, or of the orbit section it replaces.
      ...(old
        ? {
            eyebrow: old.props.eyebrow,
            title: old.props.title,
            text: old.props.text,
            buttonLabel: old.props.buttonLabel,
            buttonLink: old.props.buttonLink,
          }
        : {}),
    },
  });

  const translations = page.translations.map((tr) => {
    const l = tr.locale;
    const blocks = structuredClone(tr.blocks ?? []);
    const notes = [];
    if (wants('hero')) {
      const hero = blocks.find((b) => b.type === 'aurora-hero');
      if (hero) {
        hero.props = { ...hero.props, scene: 'animals', animals: heroAnimals };
        notes.push('hero: 3D animals under the headline');
      } else notes.push('hero: no aurora hero on this page, left alone');
    }
    const journeys = blocks.filter((b) => b.type === 'cosmos-3d');
    const oldJungle = journeys.find((b) => b.props?.scene === 'jungle');
    const oldGalaxy = journeys.find((b) => b.props?.scene === 'galaxy');
    const orbit = blocks.find((b) => b.type === 'orbit');
    if (wants('galaxy')) {
      if (oldGalaxy) {
        blocks.splice(blocks.indexOf(oldGalaxy), 1, galaxy(l, oldGalaxy));
        notes.push('galaxy: updated');
      } else if (orbit) {
        blocks.splice(blocks.indexOf(orbit), 1, galaxy(l, orbit));
        notes.push('galaxy: in place of the "A small solar system" orbit section');
      } else {
        const at = blocks.findIndex((b) => b.type === 'counters');
        blocks.splice(at >= 0 ? at : Math.max(0, blocks.length - 1), 0, galaxy(l));
        notes.push('galaxy: added');
      }
    }
    if (wants('jungle')) {
      if (oldJungle) {
        blocks.splice(blocks.indexOf(oldJungle), 1, jungle(l, oldJungle));
        notes.push('jungle: updated');
      } else {
        // Just before the galaxy, else before the counters, else before the last section.
        const g = blocks.findIndex((b) => b.type === 'cosmos-3d' && b.props?.scene === 'galaxy');
        const c = blocks.findIndex((b) => b.type === 'counters');
        const at = g >= 0 ? g : c >= 0 ? c : Math.max(0, blocks.length - 1);
        blocks.splice(at, 0, jungle(l));
        notes.push('jungle: added');
      }
    }
    // Block ids must be unique on the page.
    const ids = new Set();
    for (const b of blocks) {
      if (b.id && ids.has(b.id)) b.id = `${b.id}-${ids.size}`;
      if (b.id) ids.add(b.id);
    }
    say(`Home page /${l}: ${notes.join('; ')}`);
    return {
      locale: l,
      title: tr.title,
      slug: tr.slug,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
      ogImage: tr.ogImage,
      blocks,
    };
  });

  if (!DRY) {
    await api('PATCH', `/admin/pages/${page.id}`, { translations });
    if (hadDraft) {
      say('Home page saved as a draft: it already had unpublished changes of yours, so check it in the editor and publish it there.');
    } else {
      await api('POST', `/admin/pages/${page.id}/publish`);
      say('Home page saved and published (the version before is in its history).');
    }
  }
}
say('Done.');
