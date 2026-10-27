/**
 * Builds the FikkoPrint site (fikkoprint.com) in Persian and English: a printing company that does sublimation
 * printing only — mugs, polyester clothing, phone cases, cushions, metal photo panels and more — with generated
 * placeholder pictures of the products and the process, and a News collection of real sublimation stories.
 * Two looks: the warm workshop look of whitecotton.pt in the Atelier blocks (the default, see fikkoprint-atelier.mjs),
 * or a page made mostly of animated blocks (--look=animated).
 * It only talks to the admin API, so it works against a local site or a live one.
 *
 *   node scripts/seed-fikkoprint.mjs           a separate page at /fa/چاپ-سابلیمیشن and /en/sublimation-printing (safe)
 *   node scripts/seed-fikkoprint.mjs --home    replaces the home page, and sets the site name, logo, menu and colors
 *   add --look=animated                         for the animated page instead of the Atelier one
 *
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD, and SITE (the site's address)
 * when the installation has several sites, e.g. SITE=fikkoprint.com.
 * Running it again updates the same page; the pictures are uploaded again each time.
 * On the server, see the "FikkoPrint content" section of DEPLOY.md.
 */
import { createRequire } from 'node:module';
import { atelierContent } from './fikkoprint-atelier.mjs';

const API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
// With several sites, the one to fill: its address, e.g. SITE=fikkoprint.com (sent as X-Forwarded-Host).
const SITE = process.env.SITE ? { 'x-forwarded-host': process.env.SITE } : {};
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const HOME = process.argv.includes('--home');
const LOOK = process.argv.includes('--look=animated') ? 'animated' : 'atelier';

/** sharp comes with the API: next to this file in the repository, or in /app inside the API image. */
function loadSharp() {
  for (const base of [new URL('../apps/api/package.json', import.meta.url).pathname, '/app/apps/api/package.json']) {
    try {
      return createRequire(base)('sharp');
    } catch {
      // try the next place
    }
  }
  throw new Error('sharp not found: run `npm install` first, or run this inside the API container');
}
const sharp = loadSharp();

// ---------- API ----------
const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...SITE },
  body: JSON.stringify(ADMIN),
});
if (!login.ok) throw new Error(`login failed (${login.status}): check API_URL, ADMIN_EMAIL and ADMIN_PASSWORD`);
const token = (await login.json()).token;

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

async function upload(bytes, name, type) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...SITE }, body: fd });
  if (!res.ok) throw new Error(`upload ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

// ---------- Illustrations: a printed design, the products wearing it, and the steps of the process ----------
const W = 1600;
const H = 1100;
const PALETTES = {
  sunset: ['#ff3d7f', '#ff9f1c', '#ffd400', '#5b2a86'],
  ocean: ['#00a0e9', '#00d1b2', '#2b2d8f', '#b8f3ff'],
  candy: ['#e6007e', '#7c3aed', '#00a0e9', '#ffd400'],
  jungle: ['#16a34a', '#facc15', '#0f766e', '#f97316'],
  berry: ['#9d174d', '#f472b6', '#4c1d95', '#fde68a'],
  team: ['#1d4ed8', '#facc15', '#0f172a', '#ffffff'],
};

/** A full-colour design (gradient, waves and dots), the kind of artwork customers send; drawn into a w×h box. */
function design(id, palette, seed, w, h) {
  const [a, b, c, d] = PALETTES[palette];
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const waves = Array.from({ length: 5 }, (_, i) => {
    const y = h * (0.25 + i * 0.16);
    const amp = h * (0.06 + rnd() * 0.08);
    return `<path d="M 0 ${y} C ${w * 0.25} ${y - amp}, ${w * 0.5} ${y + amp}, ${w} ${y - amp * 0.5} L ${w} ${h} L 0 ${h} Z"
      fill="${[b, c, d, a, b][i]}" fill-opacity="${0.35 + i * 0.1}"/>`;
  }).join('');
  const dots = Array.from({ length: 14 }, () => {
    const s = Math.min(w, h) * (0.02 + rnd() * 0.07);
    return `<circle cx="${rnd() * w}" cy="${rnd() * h * 0.7}" r="${s}" fill="${[d, '#fff', c][Math.floor(rnd() * 3)]}" fill-opacity=".8"/>`;
  }).join('');
  return `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <g id="${id}"><rect width="${w}" height="${h}" fill="url(#${id}g)"/>
    <circle cx="${w * 0.7}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.28}" fill="${c}" fill-opacity=".85"/>${waves}${dots}</g>`;
}

/** A soft studio background with a floor shadow. */
function studio(bg, extra = '') {
  return `<defs><radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>${extra}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/><ellipse cx="${W / 2}" cy="${H * 0.86}" rx="${W * 0.28}" ry="${H * 0.05}" fill="url(#sh)"/>`;
}

/**
 * Outlines of the products, in a 1600×1100 picture, centred: `body` is the print area the design is clipped to, `back`
 * is drawn behind it and `extra` in front.
 */
const SHAPES = {
  mug: {
    body: `<rect x="520" y="300" width="460" height="560" rx="40"/>`,
    back: `<path d="M 980 420 C 1180 420, 1180 760, 980 760" fill="none" stroke="#f1f5f9" stroke-width="56"/>`,
    extra: `<ellipse cx="750" cy="300" rx="230" ry="34" fill="#e2e8f0"/><ellipse cx="750" cy="300" rx="200" ry="24" fill="#94a3b8"/>`,
  },
  tshirt: {
    body: `<path d="M 600 240 L 470 290 L 330 450 L 450 540 L 520 470 L 520 900 L 1080 900 L 1080 470 L 1150 540 L 1270 450 L 1130 290 L 1000 240 C 960 300, 640 300, 600 240 Z"/>`,
    extra: `<path d="M 600 240 C 640 300, 960 300, 1000 240" fill="none" stroke="#0002" stroke-width="10"/>`,
  },
  phone: {
    body: `<rect x="590" y="160" width="420" height="820" rx="70"/>`,
    extra: `<rect x="630" y="200" width="150" height="180" rx="36" fill="#0f172a" fill-opacity=".85"/>
      <circle cx="675" cy="250" r="28" fill="#334155"/><circle cx="740" cy="330" r="28" fill="#334155"/>`,
  },
  cushion: {
    body: `<path d="M 420 300 Q 800 230 1180 300 Q 1250 590 1180 880 Q 800 950 420 880 Q 350 590 420 300 Z"/>`,
    extra: '',
  },
  panel: {
    body: `<rect x="330" y="230" width="940" height="640" rx="14"/>`,
    extra: `<path d="M 330 230 L 760 230 L 330 700 Z" fill="#fff" fill-opacity=".18"/>`,
  },
  puzzle: {
    body: `<rect x="380" y="250" width="840" height="620" rx="10"/>`,
    extra: [0, 1, 2]
      .map(
        (i) =>
          `<path d="M ${590 + i * 210} 250 L ${590 + i * 210} 870" stroke="#0004" stroke-width="5" stroke-dasharray="60 14 20 14" fill="none"/>`,
      )
      .concat(
        [0, 1].map(
          (i) =>
            `<path d="M 380 ${457 + i * 207} L 1220 ${457 + i * 207}" stroke="#0004" stroke-width="5" stroke-dasharray="50 14 20 14" fill="none"/>`,
        ),
      )
      .join(''),
  },
  mousepad: {
    body: `<path d="M 300 560 L 1080 420 L 1320 680 L 520 860 Z"/>`,
    extra: '',
  },
  bottle: {
    body: `<rect x="640" y="300" width="320" height="640" rx="60"/>`,
    extra: `<rect x="690" y="170" width="220" height="140" rx="30" fill="#cbd5e1"/><rect x="740" y="130" width="120" height="60" rx="18" fill="#94a3b8"/>`,
  },
  jersey: {
    body: `<path d="M 620 220 L 480 280 L 400 520 L 500 550 L 540 450 L 540 920 L 1060 920 L 1060 450 L 1100 550 L 1200 520 L 1120 280 L 980 220 L 800 340 Z"/>`,
    extra: `<text x="800" y="720" font-family="DejaVu Sans, sans-serif" font-weight="900" font-size="260" fill="#fff" text-anchor="middle" fill-opacity=".92">10</text>`,
  },
  coaster: {
    body: `<circle cx="660" cy="560" r="260"/><circle cx="980" cy="600" r="220"/>`,
    extra: '',
  },
};

/** A product with the design printed on it, or blank (white) for the before/after. */
function product(kind, { palette = 'candy', seed = 1, bg = ['#fdf2f8', '#c4b5fd'], blank = false } = {}) {
  const s = SHAPES[kind];
  const print = blank
    ? `<g clip-path="url(#clip)"><rect width="${W}" height="${H}" fill="#f8fafc"/><rect x="${W / 2}" width="${W / 2}" height="${H}" fill="#e2e8f0"/></g>`
    : `<g clip-path="url(#clip)"><use href="#art"/>
       <rect width="${W}" height="${H}" fill="url(#gloss)"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
    ${studio(
      bg,
      `${design('art', palette, seed, W, H)}<clipPath id="clip">${s.body}</clipPath>
      <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".35" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>`,
    )}
    ${s.back ?? ''}${print}${s.extra}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

/** The steps of sublimation: the design on screen, printed mirrored on paper, the heat press, the ink as gas, done. */
function step(kind) {
  const bg = { screen: ['#1e1b4b', '#0b0a12'], paper: ['#fff7ed', '#fdba74'], press: ['#450a0a', '#0b0a12'], gas: ['#0c4a6e', '#020617'] }[
    kind
  ];
  let body = '';
  if (kind === 'screen') {
    body = `<rect x="300" y="170" width="1000" height="640" rx="28" fill="#0f172a" stroke="#334155" stroke-width="14"/>
      <svg x="330" y="200" width="940" height="580"><use href="#art"/></svg>
      <rect x="720" y="810" width="160" height="110" fill="#334155"/><rect x="580" y="910" width="440" height="30" rx="15" fill="#475569"/>`;
  } else if (kind === 'paper') {
    body = `<g transform="rotate(-5 800 550)"><rect x="420" y="170" width="760" height="800" fill="#fff" stroke="#0001" stroke-width="3"/>
      <g transform="translate(1150 200) scale(-1 1)"><svg width="700" height="740" opacity=".75"><use href="#art"/></svg></g></g>
      ${['#00a0e9', '#e6007e', '#ffd400', '#111827'].map((c, i) => `<circle cx="${1290 + (i % 2) * 90}" cy="${260 + Math.floor(i / 2) * 90}" r="36" fill="${c}"/>`).join('')}`;
  } else if (kind === 'press') {
    body = `<rect x="440" y="250" width="720" height="150" rx="24" fill="#1f2937" stroke="#ef4444" stroke-width="6"/>
      <rect x="760" y="100" width="80" height="160" fill="#374151"/><rect x="620" y="80" width="360" height="50" rx="25" fill="#4b5563"/>
      <rect x="470" y="400" width="660" height="40" fill="#ef4444" fill-opacity=".7"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M ${520 + i * 140} 470 q 20 30 0 60 q -20 30 0 60" stroke="#f97316" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>`).join('')}
      <rect x="440" y="650" width="720" height="140" rx="20" fill="#111827"/><svg x="470" y="610" width="660" height="60"><use href="#art"/></svg>
      <text x="800" y="920" font-family="DejaVu Sans, sans-serif" font-weight="900" font-size="110" fill="#fca5a5" text-anchor="middle">200°C · 60s</text>`;
  } else if (kind === 'gas') {
    let r = 5;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const fibres = Array.from(
      { length: 9 },
      (_, i) =>
        `<path d="M 200 ${560 + i * 50} C 600 ${520 + i * 50}, 1000 ${600 + i * 50}, 1400 ${560 + i * 50}" stroke="#e2e8f0" stroke-opacity=".45" stroke-width="22" fill="none"/>`,
    ).join('');
    const ink = Array.from({ length: 90 }, () => {
      const y = 140 + rnd() * 760;
      const into = y > 560;
      return `<circle cx="${200 + rnd() * 1200}" cy="${y}" r="${into ? 9 : 13}" fill="${['#00a0e9', '#e6007e', '#ffd400'][Math.floor(rnd() * 3)]}" fill-opacity="${into ? 0.95 : 0.6}"/>`;
    }).join('');
    body = `${fibres}${ink}<path d="M 800 160 L 800 460" stroke="#fff" stroke-width="10" stroke-dasharray="20 18"/><path d="M 760 430 L 800 490 L 840 430" fill="none" stroke="#fff" stroke-width="10"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
    ${design('art', 'candy', 9, 940, 740)}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${body}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

/** The logo mark: four ink drops (cyan, magenta, yellow, black); the header writes the site name next to it. */
function logo() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    ${['#00a0e9', '#e6007e', '#ffd400', '#111827'].map((c, i) => `<circle cx="${46 + (i % 2) * 68}" cy="${46 + Math.floor(i / 2) * 68}" r="34" fill="${c}"/>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const up = async (buf, name) => upload(await buf, name, 'image/jpeg');
// The animated look's pictures; the Atelier look draws its own.
const img =
  LOOK !== 'animated'
    ? {}
    : {
        mug: await up(product('mug', { palette: 'sunset', seed: 3, bg: ['#fff7ed', '#fda4af'] }), 'mug.jpg'),
        mugBlank: await up(product('mug', { blank: true, bg: ['#f8fafc', '#94a3b8'] }), 'mug-blank.jpg'),
        mugAfter: await up(product('mug', { palette: 'candy', seed: 7, bg: ['#fdf2f8', '#c4b5fd'] }), 'mug-printed.jpg'),
        tshirt: await up(product('tshirt', { palette: 'ocean', seed: 5, bg: ['#ecfeff', '#67e8f9'] }), 'tshirt.jpg'),
        phone: await up(product('phone', { palette: 'berry', seed: 11, bg: ['#fdf4ff', '#d8b4fe'] }), 'phone-case.jpg'),
        cushion: await up(product('cushion', { palette: 'jungle', seed: 13, bg: ['#f7fee7', '#a3e635'] }), 'cushion.jpg'),
        panel: await up(product('panel', { palette: 'sunset', seed: 17, bg: ['#1e293b', '#020617'] }), 'metal-panel.jpg'),
        puzzle: await up(product('puzzle', { palette: 'candy', seed: 19, bg: ['#fefce8', '#fde047'] }), 'puzzle.jpg'),
        mousepad: await up(product('mousepad', { palette: 'ocean', seed: 23, bg: ['#eef2ff', '#818cf8'] }), 'mousepad.jpg'),
        bottle: await up(product('bottle', { palette: 'berry', seed: 29, bg: ['#fff1f2', '#fb7185'] }), 'bottle.jpg'),
        jersey: await up(product('jersey', { palette: 'team', seed: 31, bg: ['#eff6ff', '#60a5fa'] }), 'jersey.jpg'),
        coaster: await up(product('coaster', { palette: 'jungle', seed: 37, bg: ['#fff7ed', '#fdba74'] }), 'coasters.jpg'),
        screen: await up(step('screen'), 'step-design.jpg'),
        paper: await up(step('paper'), 'step-transfer-paper.jpg'),
        press: await up(step('press'), 'step-heat-press.jpg'),
        gas: await up(step('gas'), 'step-ink-gas.jpg'),
      };
const logoUrl = HOME ? await upload(await logo(), 'fikkoprint-logo.png', 'image/png') : '';

// ---------- News: five real stories from the sublimation industry, each summarised in both languages ----------
// The pictures are drawn here (a wide-format or desktop printer feeding out a print); the stories link to their sources.
function newsCover({ wide, palette, seed, bg }) {
  const [x, w] = wide ? [180, 1240] : [470, 660];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${studio(bg, design('art', palette, seed, w - 80, 420))}
    <svg x="${x + 40}" y="520" width="${w - 80}" height="330"><use href="#art"/></svg>
    <rect x="${x}" y="300" width="${w}" height="240" rx="36" fill="#1f2937"/>
    <rect x="${x + 30}" y="330" width="${w - 60}" height="40" rx="12" fill="#374151"/>
    <rect x="${x + w - 220}" y="400" width="150" height="70" rx="14" fill="#0ea5e9" fill-opacity=".8"/>
    ${['#00a0e9', '#e6007e', '#ffd400', '#111827'].map((c, i) => `<circle cx="${x + 70 + i * 60}" cy="440" r="20" fill="${c}"/>`).join('')}
    ${wide ? `<rect x="${x + 40}" y="540" width="40" height="400" fill="#374151"/><rect x="${x + w - 80}" y="540" width="40" height="400" fill="#374151"/>` : ''}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}

const NEWS = [
  {
    slug: { en: 'mimaki-ts330-1800-wide-sublimation-printer', fa: 'میماکی-ts330-1800' },
    date: { en: '7 January 2026', fa: '۱۷ دی ۱۴۰۴' },
    source: 'Mimaki',
    link: 'https://mimaki.com/news/product/entry-438590.html',
    cover: { wide: true, palette: 'ocean', seed: 41, bg: ['#ecfeff', '#0e7490'] },
    tags: { en: ['Printers', 'Textiles'], fa: ['چاپگر', 'منسوجات'] },
    en: {
      title: 'Mimaki adds a 1.9-metre printer to its TS330 sublimation line',
      excerpt: 'The TS330-1800 prints up to 1,940 mm wide, so curtains and wide fabrics come out in one seamless piece.',
      body: 'Japanese printer maker Mimaki began selling the TS330-1800 in January 2026, a wider member of its TS330 family of sublimation transfer printers. It prints up to 1,940 mm wide on media up to 1,950 mm.\n\nThe extra width is aimed at two jobs. Interior fabrics such as curtains and tapestries can be printed as one piece, with no seams to sew or patterns to match. For sports uniforms, body panels in several sizes can sit side by side on the transfer paper, which makes laying out names and numbers easier.\n\nWhy it matters to us: wide transfer printers are what make seamless team kits and large soft signage affordable in short runs.',
    },
    fa: {
      title: 'میماکی چاپگر ۱.۹ متری به خانواده‌ی سابلیمیشن TS330 اضافه کرد',
      excerpt: 'مدل TS330-1800 تا عرض ۱۹۴۰ میلی‌متر چاپ می‌کند؛ پرده و پارچه‌های عریض یکپارچه و بدون درز درمی‌آیند.',
      body: 'شرکت ژاپنی میماکی از دی ۱۴۰۴ (ژانویه‌ی ۲۰۲۶) فروش TS330-1800 را آغاز کرد؛ نسخه‌ی عریض‌تر خانواده‌ی چاپگرهای انتقال سابلیمیشن TS330. این دستگاه تا عرض ۱۹۴۰ میلی‌متر روی رسانه‌ای تا ۱۹۵۰ میلی‌متر چاپ می‌کند.\n\nعرض بیشتر برای دو کار است: پارچه‌های دکوراتیو مثل پرده و دیوارکوب یک‌تکه چاپ می‌شوند، بدون دوخت و هم‌ترازی طرح؛ و در لباس تیمی، قطعات بدنه در چند سایز کنار هم روی کاغذ انتقال چیده می‌شوند و جای نام و شماره راحت‌تر تنظیم می‌شود.\n\nچرا برای ما مهم است: چاپگرهای انتقال عریض، لباس تیمی بی‌درز و بنرهای پارچه‌ای بزرگ را در تیراژ کم هم مقرون‌به‌صرفه می‌کنند.',
    },
  },
  {
    slug: { en: 'epson-surecolor-sc-f20000-industrial-dye-sub', fa: 'اپسون-sc-f20000' },
    date: { en: '7 May 2026', fa: '۱۷ اردیبهشت ۱۴۰۵' },
    source: 'Signlink',
    link: 'https://www.signlink.co.uk/news/epson-launches-new-industrial-dye-sub-printer/',
    cover: { wide: true, palette: 'sunset', seed: 43, bg: ['#fff7ed', '#c2410c'] },
    tags: { en: ['Printers', 'Industrial'], fa: ['چاپگر', 'صنعتی'] },
    en: {
      title: 'Epson’s SC-F20000: eight printheads and around 306 m² an hour',
      excerpt: 'Epson’s new industrial dye-sublimation printer is built for sportswear, fashion, homewares and soft signage.',
      body: 'Epson launched the SureColor SC-F20000 in May 2026, its first dye-sublimation printer with eight PrecisionCore MicroTFP printheads. In its fastest mode it prints up to about 306 square metres an hour at 600 dpi.\n\nIt takes 10-litre ink cartridges with automatic “hot swap” switching, so production does not stop for a refill, and has an intake fan and media cleaner to keep dust from clogging the nozzles. An optional jumbo-roll unit handles larger rolls. Epson showed it at FESPA Global Print Expo 2026 in Barcelona (19–22 May).\n\nWhy it matters to us: industrial speed is what brings the price of all-over printed sportswear closer to that of plain garments.',
    },
    fa: {
      title: 'اپسون SC-F20000؛ هشت هد چاپ و حدود ۳۰۶ مترمربع در ساعت',
      excerpt: 'چاپگر صنعتی سابلیمیشن جدید اپسون برای لباس ورزشی، پوشاک، منسوجات خانگی و بنر پارچه‌ای ساخته شده است.',
      body: 'اپسون در اردیبهشت ۱۴۰۵ (مه ۲۰۲۶) از SureColor SC-F20000 رونمایی کرد؛ نخستین چاپگر سابلیمیشن این شرکت با هشت هد PrecisionCore MicroTFP. سرعت آن در سریع‌ترین حالت حدود ۳۰۶ مترمربع در ساعت با وضوح ۶۰۰ dpi است.\n\nکارتریج‌های ۱۰ لیتری با تعویض خودکار (Hot Swap) باعث می‌شوند تولید برای شارژ جوهر متوقف نشود، و فن ورودی و پاک‌کننده‌ی رسانه جلوی گرفتگی نازل‌ها با گردوغبار را می‌گیرند. اپسون این دستگاه را در نمایشگاه FESPA 2026 بارسلونا (۲۹ اردیبهشت تا ۱ خرداد) نشان داد.\n\nچرا برای ما مهم است: سرعت صنعتی، قیمت لباس ورزشی با چاپ سراسری را به قیمت لباس ساده نزدیک‌تر می‌کند.',
    },
  },
  {
    slug: { en: 'mimaki-ts330-1800-wins-edp-award-2026', fa: 'جایزه-edp-میماکی' },
    date: { en: '9 June 2026', fa: '۱۹ خرداد ۱۴۰۵' },
    source: 'Mimaki',
    link: 'https://mimaki.com/news/product/entry-448040.html',
    cover: { wide: true, palette: 'candy', seed: 47, bg: ['#fdf4ff', '#7c3aed'] },
    tags: { en: ['Awards', 'Textiles'], fa: ['جایزه', 'منسوجات'] },
    en: {
      title: 'A sublimation printer wins Best Textile Roll-to-Roll at the EDP Awards 2026',
      excerpt:
        'Mimaki’s TS330-1800, with eleven ink colours including two fluorescents, won its category at Europe’s print-technology awards.',
      body: 'At the 19th EDP Awards, judged by the European Digital Press Association, Mimaki’s TS330-1800 won “Best Textile Roll-to-Roll printer under 150 m²/h”. Two of Mimaki’s UV printers won in other categories.\n\nThe judges pointed to its stable media transport and high-capacity ink options for industrial production. The printer reaches about 140 m² an hour and can use up to eleven ink colours, including orange, violet and two fluorescent shades.\n\nWhy it matters to us: fluorescent sublimation inks are what make neon team kits and eye-catching event flags possible.',
    },
    fa: {
      title: 'یک چاپگر سابلیمیشن برنده‌ی جایزه‌ی بهترین چاپگر رول‌به‌رول پارچه در EDP 2026 شد',
      excerpt: 'TS330-1800 میماکی با یازده رنگ جوهر، از جمله دو رنگ فلورسنت، در جوایز فناوری چاپ اروپا برنده‌ی رشته‌ی خود شد.',
      body: 'در نوزدهمین دوره‌ی جوایز EDP که انجمن چاپ دیجیتال اروپا داوری می‌کند، TS330-1800 میماکی عنوان «بهترین چاپگر رول‌به‌رول پارچه زیر ۱۵۰ مترمربع در ساعت» را برد. دو چاپگر UV میماکی هم در رشته‌های دیگر برنده شدند.\n\nداوران به حرکت پایدار رسانه و گزینه‌های جوهر پرظرفیت برای تولید صنعتی اشاره کردند. این چاپگر به حدود ۱۴۰ مترمربع در ساعت می‌رسد و تا یازده رنگ جوهر، از جمله نارنجی، بنفش و دو رنگ فلورسنت، به کار می‌برد.\n\nچرا برای ما مهم است: جوهرهای فلورسنت سابلیمیشن، لباس تیمی نئونی و پرچم‌های چشم‌گیر رویدادها را ممکن می‌کنند.',
    },
  },
  {
    slug: { en: 'epson-sc-f300-a3-desktop-sublimation', fa: 'اپسون-sc-f300' },
    date: { en: '17 September 2026', fa: '۲۶ شهریور ۱۴۰۵' },
    source: 'Eye on Display',
    link: 'https://www.eyeondisplay.com/epson-launches-sc-f300-desktop-dye-sublimation-printer/',
    cover: { wide: false, palette: 'berry', seed: 53, bg: ['#fff1f2', '#be185d'] },
    tags: { en: ['Printers', 'Small business'], fa: ['چاپگر', 'کسب‌وکار کوچک'] },
    en: {
      title: 'Epson’s SC-F300 brings A3 sublimation to the desktop',
      excerpt: 'A compact A3 printer with a continuous ink supply, for small shops moving up from A4.',
      body: 'Epson launched the SureColor SC-F300 in September 2026, a compact A3 dye-sublimation printer for small businesses, promotional-merchandise makers and apparel decorators who have outgrown A4.\n\nIt has a continuous ink supply system to lower running costs and cut the stops for refills, a 150-sheet A4 cassette plus a 15-sheet rear tray for A3, a 2.7-inch touchscreen, and Wi-Fi, Ethernet, USB, AirPrint and Mopria. Epson lists apparel transfers, tote bags, cushion covers, sports accessories, ceramics and promotional signs among its uses.\n\nWhy it matters to us: A3 transfers cover a whole T-shirt front or a large cushion in one sheet.',
    },
    fa: {
      title: 'اپسون SC-F300 چاپ سابلیمیشن A3 را روی میز می‌آورد',
      excerpt: 'چاپگری جمع‌وجور در اندازه‌ی A3 با سیستم جوهر پیوسته، برای کارگاه‌های کوچکی که از A4 بزرگ‌تر شده‌اند.',
      body: 'اپسون در شهریور ۱۴۰۵ (سپتامبر ۲۰۲۶) SureColor SC-F300 را عرضه کرد؛ چاپگر سابلیمیشن رومیزی A3 برای کسب‌وکارهای کوچک، تولیدکنندگان کالای تبلیغاتی و چاپ پوشاک که دیگر A4 جوابگویشان نیست.\n\nسیستم جوهر پیوسته (CISS) هزینه‌ی چاپ و توقف برای شارژ را کم می‌کند. یک کاست ۱۵۰ برگی A4 و سینی عقب ۱۵ برگی برای A3 دارد، با صفحه‌ی لمسی ۲.۷ اینچی و اتصال Wi-Fi، اترنت، USB، AirPrint و Mopria. اپسون کاربردهایش را انتقال روی لباس، ساک پارچه‌ای، روکش کوسن، لوازم ورزشی، سرامیک و تابلوهای تبلیغاتی می‌داند.\n\nچرا برای ما مهم است: انتقال A3 جلوی کامل یک تی‌شرت یا یک کوسن بزرگ را با یک برگ می‌پوشاند.',
    },
  },
  {
    slug: { en: 'epson-surecolor-f370-and-cotton-primer', fa: 'اپسون-f370-پرایمر-پنبه' },
    date: { en: '23 September 2026', fa: '۱ مهر ۱۴۰۵' },
    source: 'Engineering.com',
    link: 'https://www.engineering.com/epson-launches-surecolor-f370-dye-sublimation-printer/',
    cover: { wide: false, palette: 'jungle', seed: 59, bg: ['#f7fee7', '#15803d'] },
    tags: { en: ['Printers', 'Cotton'], fa: ['چاپگر', 'پنبه'] },
    en: {
      title: 'Epson’s F370 arrives with a primer for sublimating on cotton',
      excerpt: 'A 13×19-inch printer for makers and schools, plus a liquid primer that lets sublimation work on white and light cotton.',
      body: 'At PRINTING United Expo 2026 in Las Vegas, Epson introduced the SureColor F370, a dye-sublimation printer for makers, small businesses, schools and customisation shops. It prints up to 13 × 19 inches, with a 150-sheet letter-size cassette and a 15-sheet tray for the large size. The list price is $999.\n\nAlongside it came Sublimation Primer for Cotton ($149.95), a liquid treatment that lets sublimation inks bond with white and light-coloured cotton garments, not only polyester. Both go on sale in November 2026 through Epson partners and the Epson online store.\n\nWhy it matters to us: cotton has always been sublimation’s great limit. A primer opens the door to the cotton T-shirts our customers keep asking about — we will test it before we offer it.',
    },
    fa: {
      title: 'اپسون F370 با پرایمری برای چاپ سابلیمیشن روی پنبه از راه رسید',
      excerpt: 'چاپگری ۱۳×۱۹ اینچی برای سازندگان و مدارس، همراه با مایعی که سابلیمیشن را روی پارچه‌ی نخی سفید و روشن ممکن می‌کند.',
      body: 'اپسون در نمایشگاه PRINTING United 2026 لاس‌وگاس، SureColor F370 را معرفی کرد؛ چاپگر سابلیمیشن برای سازندگان، کسب‌وکارهای کوچک، مدارس و کارگاه‌های شخصی‌سازی. تا اندازه‌ی ۱۳ × ۱۹ اینچ چاپ می‌کند، با کاست ۱۵۰ برگی و سینی ۱۵ برگی برای اندازه‌ی بزرگ. قیمت پیشنهادی آن ۹۹۹ دلار است.\n\nهمراه آن «پرایمر سابلیمیشن برای پنبه» (۱۴۹.۹۵ دلار) معرفی شد؛ مایعی که به جوهر سابلیمیشن اجازه می‌دهد با لباس نخی سفید و رنگ روشن هم پیوند بخورد، نه فقط پلی‌استر. هر دو از آبان ۱۴۰۵ (نوامبر ۲۰۲۶) از طریق نمایندگان اپسون و فروشگاه اینترنتی آن عرضه می‌شوند.\n\nچرا برای ما مهم است: پنبه همیشه بزرگ‌ترین محدودیت سابلیمیشن بوده است. این پرایمر راه را برای تی‌شرت‌های نخی که مشتریان ما مدام سراغش را می‌گیرند باز می‌کند؛ پیش از عرضه، آن را آزمایش می‌کنیم.',
    },
  },
];
const newsCovers = [];
for (const [i, n] of NEWS.entries()) newsCovers.push(await up(newsCover(n.cover), `news-${i + 1}.jpg`));

// ---------- Content ----------
const t = (en, fa) => (l) => (l === 'en' ? en : fa);
const EMAIL = 'info@fikkoprint.com';

const blocks = (l) => [
  {
    id: 'hero',
    type: 'aurora-hero',
    props: {
      anchor: 'top',
      eyebrow: t('FikkoPrint · Sublimation printing, and nothing else', 'فیکوپرینت · فقط چاپ سابلیمیشن')(l),
      title: t('Your design, printed into', 'طرح شما، ماندگار روی')(l),
      words: t('mugs,T-shirts,phone cases,cushions,metal panels,sports kits', 'ماگ,تی‌شرت,قاب موبایل,کوسن,تابلو فلزی,لباس ورزشی')(l),
      text: t(
        'We don’t print on things — we print into them. Heat turns the ink into a gas that bonds with the surface, so the colours never crack, peel or wash out.',
        'ما روی اجسام چاپ نمی‌کنیم، درونشان چاپ می‌کنیم. حرارت جوهر را به گاز تبدیل می‌کند و با سطح یکی می‌شود؛ رنگ‌ها نه ترک می‌خورند، نه پوسته می‌شوند و نه با شستشو می‌روند.',
      )(l),
      buttonLabel: t('Send your design', 'طرحتان را بفرستید')(l),
      buttonLink: '#order',
      secondButtonLabel: t('How it works', 'چطور کار می‌کند؟')(l),
      secondButtonLink: '#process',
      color: '#ffd400',
      look: 'dark',
    },
  },
  {
    id: 'products-strip',
    type: 'logo-strip',
    props: {
      title: t('What leaves our heat presses every day', 'آنچه هر روز از زیر پرس‌های ما بیرون می‌آید')(l),
      logos: t(
        [
          'Mugs',
          'T-shirts',
          'Sports kits',
          'Phone cases',
          'Cushions',
          'Metal photo panels',
          'Puzzles',
          'Mouse pads',
          'Water bottles',
          'Coasters',
          'Keyrings',
          'Flags & banners',
        ],
        [
          'ماگ',
          'تی‌شرت',
          'لباس ورزشی',
          'قاب موبایل',
          'کوسن',
          'تابلو فلزی',
          'پازل',
          'ماوس‌پد',
          'قمقمه',
          'زیرلیوانی',
          'جاکلیدی',
          'پرچم و بنر',
        ],
      )(l).map((name) => ({ image: '', name, link: '' })),
      seconds: 35,
      twoRows: true,
      look: 'dark',
    },
  },
  {
    id: 'what',
    type: 'scroll-text',
    props: {
      anchor: 'what',
      eyebrow: t('Sublimation, in one breath', 'سابلیمیشن در یک نفس')(l),
      text: t(
        'Sublimation is when a solid turns straight into a gas. We print your design with special inks on transfer paper, press it onto the product at two hundred degrees, and the ink becomes a gas that sinks into the polyester and freezes there as it cools. The print is no longer on the surface. It is the surface.',
        'سابلیمیشن یعنی تبدیل مستقیم جامد به گاز. طرح شما را با جوهر مخصوص روی کاغذ انتقال چاپ می‌کنیم، در دمای دویست درجه روی محصول پرس می‌کنیم و جوهر به گاز تبدیل می‌شود، در پلی‌استر فرو می‌رود و با سرد شدن همان‌جا می‌ماند. چاپ دیگر روی سطح نیست؛ خودِ سطح است.',
      )(l),
    },
  },
  {
    id: 'press',
    type: 'zoom-reveal',
    props: {
      anchor: 'press',
      intro: t('200 °C · 60 seconds · 4 bar', '۲۰۰ درجه · ۶۰ ثانیه · ۴ بار فشار')(l),
      eyebrow: t('Where the magic happens', 'جایی که جادو اتفاق می‌افتد')(l),
      title: t('Heat, pressure, and a minute of patience', 'حرارت، فشار و یک دقیقه صبر')(l),
      text: t(
        'Every product has its own recipe of temperature, time and pressure. We have tuned ours on thousands of pieces, so the colours come out exactly as on your screen.',
        'هر محصول دستور خودش را از دما، زمان و فشار دارد. ما دستورهایمان را روی هزاران قطعه تنظیم کرده‌ایم تا رنگ‌ها دقیقاً همان‌طور دربیایند که روی صفحه‌ی شما بود.',
      )(l),
      buttonLabel: t('Follow a mug through the shop', 'سفر یک ماگ را دنبال کنید')(l),
      buttonLink: '#process',
      image: img.press,
    },
  },
  {
    id: 'process',
    type: 'sticky-story',
    props: {
      anchor: 'process',
      title: t('From your file to your hands, in five steps', 'از فایل شما تا دستان شما، در پنج قدم')(l),
      imageSide: 'start',
      steps: [
        {
          image: img.screen,
          eyebrow: t('Step 1 · Your design', 'گام ۱ · طرح شما')(l),
          title: t('Send a photo, a logo, or just an idea', 'یک عکس، یک لوگو یا فقط یک ایده بفرستید')(l),
          text: t(
            'A phone photo is fine. Our designers check the resolution, fix the colours and place the design on the product — and you approve a mock-up before anything is printed.',
            'عکس موبایل هم کافی است. طراحان ما وضوح تصویر را بررسی می‌کنند، رنگ‌ها را اصلاح می‌کنند و طرح را روی محصول می‌چینند؛ پیش از چاپ، پیش‌نمایش را تأیید می‌کنید.',
          )(l),
        },
        {
          image: img.paper,
          eyebrow: t('Step 2 · Printing', 'گام ۲ · چاپ')(l),
          title: t('Mirrored, on transfer paper', 'برعکس، روی کاغذ انتقال')(l),
          text: t(
            'The design is printed back to front with sublimation inks. On paper the colours look dull — they only wake up under heat.',
            'طرح به‌صورت آینه‌ای با جوهر سابلیمیشن چاپ می‌شود. روی کاغذ رنگ‌ها کدر به نظر می‌رسند؛ فقط زیر حرارت بیدار می‌شوند.',
          )(l),
        },
        {
          image: img.press,
          eyebrow: t('Step 3 · The press', 'گام ۳ · پرس حرارتی')(l),
          title: t('Two hundred degrees', 'دویست درجه')(l),
          text: t(
            'The paper is wrapped around the mug or laid on the fabric, and the heat press closes. Flat presses for clothing and panels, wrap presses for mugs and bottles.',
            'کاغذ دور ماگ پیچیده یا روی پارچه گذاشته می‌شود و پرس بسته می‌شود. پرس تخت برای لباس و تابلو، پرس استوانه‌ای برای ماگ و قمقمه.',
          )(l),
        },
        {
          image: img.gas,
          eyebrow: t('Step 4 · The science', 'گام ۴ · علم ماجرا')(l),
          title: t('Ink becomes gas, gas becomes colour', 'جوهر گاز می‌شود، گاز رنگ می‌شود')(l),
          text: t(
            'The heat opens the pores of the polyester. The ink skips the liquid stage, travels in as a gas, and is locked inside when the pores close again.',
            'حرارت منافذ پلی‌استر را باز می‌کند. جوهر بدون مایع شدن، به شکل گاز وارد می‌شود و با بسته شدن دوباره‌ی منافذ، همان‌جا قفل می‌شود.',
          )(l),
        },
        {
          image: img.mug,
          eyebrow: t('Step 5 · Done', 'گام ۵ · آماده')(l),
          title: t('Checked, packed, on its way', 'کنترل، بسته‌بندی، ارسال')(l),
          text: t(
            'Every piece is checked by hand for colour and position, wrapped, and sent across Iran — or picked up from our shop.',
            'هر قطعه با دست از نظر رنگ و جای طرح کنترل می‌شود، بسته‌بندی می‌شود و به سراسر ایران ارسال می‌شود؛ یا از کارگاه ما تحویل بگیرید.',
          )(l),
        },
      ],
    },
  },
  {
    id: 'compare',
    type: 'before-after',
    props: {
      animation: 'blur',
      title: t('One minute in the press', 'یک دقیقه زیر پرس')(l),
      before: img.mugBlank,
      after: img.mugAfter,
      beforeLabel: t('Blank coated mug', 'ماگ خام پوشش‌دار')(l),
      afterLabel: t('Sublimated', 'سابلیمیشن‌شده')(l),
    },
  },
  {
    id: 'products',
    type: 'horizontal-scroll',
    props: {
      anchor: 'products',
      title: t('Things we print into', 'چیزهایی که درونشان چاپ می‌کنیم')(l),
      text: t('Keep scrolling. Single pieces or a thousand — same price list, same care.', 'اسکرول کنید. یک عدد یا هزار عدد؛ همان دقت.')(l),
      cards: [
        [
          img.mug,
          t('Ceramic', 'سرامیک'),
          t('Mugs', 'ماگ'),
          t(
            'White, magic (colour-changing) and two-tone. Dishwasher safe.',
            'سفید، حرارتی (جادویی) و دورنگ. قابل شستشو در ماشین ظرف‌شویی.',
          ),
        ],
        [
          img.tshirt,
          t('Polyester', 'پلی‌استر'),
          t('T-shirts', 'تی‌شرت'),
          t('Edge-to-edge prints that breathe — no heavy layer of ink.', 'چاپ سراسری که نفس می‌کشد؛ بدون لایه‌ی سنگین جوهر.'),
        ],
        [
          img.jersey,
          t('Sportswear', 'ورزشی'),
          t('Team kits', 'لباس تیمی'),
          t('Names and numbers for every player, in one run.', 'نام و شماره‌ی هر بازیکن، در یک نوبت چاپ.'),
        ],
        [
          img.phone,
          t('Polymer', 'پلیمر'),
          t('Phone cases', 'قاب موبایل'),
          t('Glossy coated inserts for the popular models.', 'صفحه‌ی براق پوشش‌دار برای مدل‌های پرطرفدار.'),
        ],
        [
          img.panel,
          t('Aluminium', 'آلومینیوم'),
          t('Metal photo panels', 'تابلو فلزی'),
          t('Gallery-grade photos with a deep, glassy shine.', 'عکس در کیفیت گالری با درخشش عمیق و شیشه‌ای.'),
        ],
        [
          img.cushion,
          t('Home', 'خانه'),
          t('Cushions', 'کوسن'),
          t('Soft polyester covers, printed on both sides.', 'روکش پلی‌استر نرم، چاپ دورو.'),
        ],
        [img.puzzle, t('Gifts', 'هدیه'), t('Puzzles', 'پازل'), t('Your photo in 120 to 500 pieces.', 'عکس شما در ۱۲۰ تا ۵۰۰ قطعه.')],
        [
          img.bottle,
          t('Metal', 'فلز'),
          t('Water bottles', 'قمقمه'),
          t('Coated steel that keeps its colour on the go.', 'فولاد پوشش‌دار که رنگش را همه‌جا حفظ می‌کند.'),
        ],
        [
          img.mousepad,
          t('Office', 'اداری'),
          t('Mouse pads', 'ماوس‌پد'),
          t('Branded desk sets for teams and events.', 'ست‌های میز با برند شما برای تیم‌ها و رویدادها.'),
        ],
      ].map(([image, tag, title, text]) => ({ image, tag: tag(l), title: title(l), text: text(l), link: '#order' })),
    },
  },
  {
    id: 'why',
    type: 'text-scramble',
    props: {
      eyebrow: t('Why only sublimation?', 'چرا فقط سابلیمیشن؟')(l),
      lines: t(
        'It won’t crack.\nIt won’t peel.\nIt won’t fade.\nIt won’t wash out.',
        'ترک نمی‌خورد.\nپوسته نمی‌شود.\nرنگ نمی‌بازد.\nبا شستشو نمی‌رود.',
      )(l),
      text: t(
        'Other methods lay ink on top of the surface, where it wears away. Ours lives inside it. We chose to do one thing, and to do it better than anyone.',
        'روش‌های دیگر جوهر را روی سطح می‌نشانند، جایی که کم‌کم ساییده می‌شود. جوهر ما درون سطح زندگی می‌کند. ما تصمیم گرفتیم فقط یک کار انجام دهیم و آن را از همه بهتر انجام دهیم.',
      )(l),
      buttonLabel: t('See the prices', 'قیمت‌ها را ببینید')(l),
      buttonLink: '#prices',
      seconds: 3,
      look: 'dark',
    },
  },
  {
    id: 'compat',
    type: 'flip-cards',
    props: {
      anchor: 'materials',
      animation: 'flip',
      title: t('Can it be sublimated? Turn the cards over', 'قابل سابلیمیشن است؟ کارت‌ها را برگردانید')(l),
      items: [
        [
          img.tshirt,
          t('Polyester fabric', 'پارچه‌ی پلی‌استر'),
          t(
            'Yes — the more polyester, the brighter. 100% is ideal; below about 65% the colours turn pale and vintage.',
            'بله؛ هرچه پلی‌استر بیشتر، رنگ زنده‌تر. ۱۰۰٪ ایده‌آل است و زیر حدود ۶۵٪ رنگ‌ها کم‌رنگ و قدیمی می‌شوند.',
          ),
        ],
        [
          img.mug,
          t('Coated ceramic', 'سرامیک پوشش‌دار'),
          t(
            'Yes — mugs, plates and tiles with a special polymer coating. An ordinary mug from the shop won’t take the ink.',
            'بله؛ ماگ، بشقاب و کاشی با پوشش پلیمری مخصوص. ماگ معمولی مغازه جوهر را نمی‌گیرد.',
          ),
        ],
        [
          img.panel,
          t('Coated metal', 'فلز پوشش‌دار'),
          t(
            'Yes — aluminium panels, bottles and keyrings made for sublimation give the most vivid photos of all.',
            'بله؛ تابلو آلومینیومی، قمقمه و جاکلیدی مخصوص سابلیمیشن زنده‌ترین عکس‌ها را می‌دهند.',
          ),
        ],
        [
          img.cushion,
          t('Light colours only', 'فقط رنگ‌های روشن'),
          t(
            'Sublimation ink is transparent, so it needs a white or pastel base. On black fabric, the design disappears.',
            'جوهر سابلیمیشن شفاف است و زمینه‌ی سفید یا روشن می‌خواهد. روی پارچه‌ی مشکی طرح دیده نمی‌شود.',
          ),
        ],
        [
          img.phone,
          t('Hard plastics', 'پلاستیک سخت'),
          t(
            'Only with a coated insert. We use made-for-sublimation blanks, so the result is guaranteed.',
            'فقط با صفحه‌ی پوشش‌دار. ما از قطعات خام مخصوص سابلیمیشن استفاده می‌کنیم تا نتیجه تضمینی باشد.',
          ),
        ],
        [
          img.coaster,
          t('Cotton', 'نخ (پنبه)'),
          t(
            'No — cotton has nothing for the gas to bond with. Ask us about our poly-cotton blends instead.',
            'نه؛ پنبه چیزی برای پیوند با گاز ندارد. درباره‌ی پارچه‌های مخلوط پلی‌استر از ما بپرسید.',
          ),
        ],
      ].map(([image, title, back]) => ({ image, title: title(l), back: back(l), buttonLabel: '', buttonLink: '' })),
    },
  },
  {
    id: 'vivid',
    type: 'progress-bars',
    props: {
      title: t('Polyester decides the colour', 'پلی‌استر رنگ را تعیین می‌کند')(l),
      text: t(
        'How bright a print comes out on each fabric, compared with 100% polyester.',
        'درخشش چاپ روی هر پارچه، در مقایسه با پلی‌استر ۱۰۰٪.',
      )(l),
      items: [
        { label: t('100% polyester', 'پلی‌استر ۱۰۰٪')(l), value: 100 },
        { label: t('80% polyester · 20% cotton', 'پلی‌استر ۸۰٪ · پنبه ۲۰٪')(l), value: 85 },
        { label: t('65% polyester · 35% cotton', 'پلی‌استر ۶۵٪ · پنبه ۳۵٪')(l), value: 65 },
        { label: t('50% polyester · 50% cotton', 'پلی‌استر ۵۰٪ · پنبه ۵۰٪')(l), value: 45 },
        { label: t('100% cotton', 'پنبه ۱۰۰٪')(l), value: 5 },
      ],
    },
  },
  {
    id: 'who',
    type: 'stacking-cards',
    props: {
      anchor: 'who',
      title: t('Who we print for', 'برای چه کسانی چاپ می‌کنیم')(l),
      cards: [
        {
          image: img.puzzle,
          eyebrow: '01',
          title: t('Gifts that mean something', 'هدیه‌هایی که معنا دارند')(l),
          text: t(
            'Birthdays, anniversaries, Yalda, Nowruz. One mug with one photo, ready in a day.',
            'تولد، سالگرد، یلدا، نوروز. یک ماگ با یک عکس، آماده در یک روز.',
          )(l),
          color: '#9d174d',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.mousepad,
          eyebrow: '02',
          title: t('Brands and events', 'برندها و رویدادها')(l),
          text: t(
            'Promotional mugs, bottles and desk sets in your brand colours, matched batch after batch.',
            'ماگ، قمقمه و ست میز تبلیغاتی در رنگ‌های برند شما، یکسان در هر سفارش.',
          )(l),
          color: '#1d4ed8',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.jersey,
          eyebrow: '03',
          title: t('Teams and clubs', 'تیم‌ها و باشگاه‌ها')(l),
          text: t(
            'Light, breathable kits that never lose their numbers, however often they are washed.',
            'لباس سبک و قابل تنفس که شماره‌اش با هیچ شستشویی پاک نمی‌شود.',
          )(l),
          color: '#0f766e',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.panel,
          eyebrow: '04',
          title: t('Cafés, shops and designers', 'کافه‌ها، فروشگاه‌ها و طراحان')(l),
          text: t(
            'We print your collection under your name, with no minimum order.',
            'کالکشن شما را با نام خودتان چاپ می‌کنیم، بدون حداقل سفارش.',
          )(l),
          color: '#111827',
          buttonLabel: t('Start an order', 'شروع سفارش')(l),
          buttonLink: '#order',
        },
      ],
    },
  },
  {
    id: 'numbers',
    type: 'counters',
    props: {
      animation: 'rise',
      title: t('FikkoPrint in numbers', 'فیکوپرینت به زبان عدد')(l),
      items: [
        { value: 9000, prefix: '', suffix: '+', label: t('Happy customers', 'مشتری راضی')(l) },
        { value: 40, prefix: '', suffix: '+', label: t('Kinds of product', 'نوع محصول')(l) },
        { value: 24, prefix: '', suffix: 'h', label: t('Typical turnaround', 'زمان معمول آماده‌سازی')(l) },
        { value: 1, prefix: '', suffix: '', label: t('Minimum order', 'حداقل سفارش')(l) },
      ],
    },
  },
  {
    id: 'prices',
    type: 'pricing',
    props: {
      anchor: 'prices',
      title: t('Prices that drop as you order more', 'هرچه بیشتر، ارزان‌تر')(l),
      subtitle: t(
        'Per mug, design and printing included. Other products on request.',
        'قیمت هر ماگ، با طراحی و چاپ. سایر محصولات با استعلام.',
      )(l),
      currency: t('$', 'تومان')(l),
      monthlyLabel: '',
      yearlyLabel: '',
      plans: [
        {
          name: t('One for you', 'یکی برای شما')(l),
          price: t('9', '۴۵۰٬۰۰۰')(l),
          yearlyPrice: '',
          period: t('/mug', '/ ماگ')(l),
          description: t('1–9 pieces', '۱ تا ۹ عدد')(l),
          features: t(
            'Free layout of your photo\nMock-up before printing\nReady in 24 hours\n-Gift box',
            'چیدمان رایگان عکس شما\nپیش‌نمایش پیش از چاپ\nآماده در ۲۴ ساعت\n-جعبه‌ی کادویی',
          )(l),
          buttonLabel: t('Order one', 'سفارش تکی')(l),
          buttonLink: '#order',
          highlighted: false,
          badge: '',
        },
        {
          name: t('A small batch', 'سفارش کوچک')(l),
          price: t('6', '۳۲۰٬۰۰۰')(l),
          yearlyPrice: '',
          period: t('/mug', '/ ماگ')(l),
          description: t('10–99 pieces', '۱۰ تا ۹۹ عدد')(l),
          features: t(
            'Everything in “One for you”\nA different name on each piece\nGift box included\nShipping across Iran',
            'همه‌ی امکانات سفارش تکی\nنام متفاوت روی هر قطعه\nجعبه‌ی کادویی\nارسال به سراسر ایران',
          )(l),
          buttonLabel: t('Order a batch', 'ثبت سفارش')(l),
          buttonLink: '#order',
          highlighted: true,
          badge: t('Most popular', 'پرطرفدار')(l),
        },
        {
          name: t('Wholesale', 'عمده')(l),
          price: t('On request', 'استعلام')(l),
          yearlyPrice: '',
          period: '',
          description: t('100 pieces or more', '۱۰۰ عدد به بالا')(l),
          features: t(
            'Brand colours matched to Pantone\nA sample before the full run\nPriority on the presses\nA dedicated contact',
            'تطبیق رنگ برند با پنتون\nنمونه پیش از تولید انبوه\nاولویت در نوبت چاپ\nپشتیبان اختصاصی',
          )(l),
          buttonLabel: t('Get a quote', 'دریافت قیمت')(l),
          buttonLink: '#order',
          highlighted: false,
          badge: '',
        },
      ],
    },
  },
  {
    id: 'words',
    type: 'testimonials',
    props: {
      title: t('From people who unwrapped one', 'از زبان کسانی که بسته را باز کردند')(l),
      seconds: 7,
      items: [
        {
          quote: t(
            'Our team kits went through a whole season of matches and washing machines. The numbers look like the first day.',
            'لباس‌های تیممان یک فصل کامل مسابقه و ماشین لباسشویی را پشت سر گذاشت. شماره‌ها هنوز مثل روز اول‌اند.',
          )(l),
          name: t('Arash M.', 'آرش م.')(l),
          role: t('Futsal club coach', 'مربی باشگاه فوتسال')(l),
          photo: '',
        },
        {
          quote: t(
            'I sent a blurry phone photo of my grandmother. They cleaned it up and the metal panel now hangs in our living room.',
            'یک عکس تار موبایلی از مادربزرگم فرستادم. اصلاحش کردند و حالا تابلو فلزی‌اش در پذیرایی خانه‌مان است.',
          )(l),
          name: t('Negar S.', 'نگار س.')(l),
          role: t('Gift order', 'سفارش هدیه')(l),
          photo: '',
        },
        {
          quote: t(
            'Three hundred mugs for our café’s anniversary, and every one the exact same shade of our green.',
            'سیصد ماگ برای سالگرد کافه‌مان، و همه دقیقاً همان سبزِ برند ما.',
          )(l),
          name: t('Pouya R.', 'پویا ر.')(l),
          role: t('Café owner', 'صاحب کافه')(l),
          photo: '',
        },
      ],
    },
  },
  {
    id: 'news',
    type: 'collection-list',
    props: {
      anchor: 'news',
      title: t('Sublimation news', 'اخبار سابلیمیشن')(l),
      subtitle: t(
        'What is new in the presses, inks and printers of our trade, summed up by our team with a link to each source.',
        'تازه‌های پرس، جوهر و چاپگرهای حرفه‌ی ما، به قلم تیم ما و با لینک به منبع هر خبر.',
      )(l),
      collection: 'news',
      variant: 'photo',
      columns: '3',
      limit: 6,
      tag: '',
      showFilters: false,
      buttonLabel: t('All news', 'همه‌ی اخبار')(l),
    },
  },
  {
    id: 'faq',
    type: 'faq',
    props: {
      anchor: 'faq',
      animation: 'rise',
      title: t('Questions we hear every day', 'پرسش‌هایی که هر روز می‌شنویم')(l),
      subtitle: t('Something else? Write to us below.', 'سؤال دیگری دارید؟ پایین صفحه برایمان بنویسید.')(l),
      items: [
        [
          t('Can you print on a black T-shirt?', 'روی تی‌شرت مشکی چاپ می‌کنید؟'),
          t(
            'Not with sublimation: the ink is transparent, so it needs a white or light base. We suggest a white or pastel polyester shirt — or an all-over print where the design itself is dark.',
            'با سابلیمیشن نه؛ جوهر شفاف است و زمینه‌ی سفید یا روشن می‌خواهد. تی‌شرت پلی‌استر سفید یا رنگ روشن پیشنهاد می‌کنیم، یا چاپ سراسری که خود طرح تیره باشد.',
          ),
        ],
        [
          t('Will the print wash out?', 'چاپ با شستشو می‌رود؟'),
          t(
            'No. The ink is inside the fibres or the coating, not on top. Mugs are dishwasher safe and clothes can go in the machine like any other.',
            'نه. جوهر درون الیاف یا پوشش است، نه روی آن. ماگ‌ها در ماشین ظرف‌شویی و لباس‌ها مثل هر لباس دیگری در ماشین لباسشویی شسته می‌شوند.',
          ),
        ],
        [
          t('What file should I send?', 'چه فایلی بفرستم؟'),
          t(
            'Any photo or design — JPG, PNG, PDF or a phone picture. The larger the better; we check it and tell you before printing if it will look blurry.',
            'هر عکس یا طرحی: JPG، PNG، PDF یا عکس موبایل. هرچه بزرگ‌تر بهتر؛ پیش از چاپ بررسی می‌کنیم و اگر تار شود خبرتان می‌کنیم.',
          ),
        ],
        [
          t('How long does an order take?', 'سفارش چقدر طول می‌کشد؟'),
          t(
            'Single pieces are usually ready within 24 hours of approving the mock-up. Batches of a hundred or more take two to five working days.',
            'سفارش‌های تکی معمولاً ۲۴ ساعت پس از تأیید پیش‌نمایش آماده‌اند. سفارش‌های صدتایی به بالا دو تا پنج روز کاری.',
          ),
        ],
        [
          t('Can I bring my own mug or shirt?', 'می‌توانم ماگ یا لباس خودم را بیاورم؟'),
          t(
            'Only if it is made for sublimation (coated ceramic, or mostly polyester fabric). Otherwise the ink will not hold — we would rather tell you than waste your piece.',
            'فقط اگر مخصوص سابلیمیشن باشد (سرامیک پوشش‌دار یا پارچه‌ی عمدتاً پلی‌استر). وگرنه جوهر نمی‌گیرد؛ ترجیح می‌دهیم بگوییم تا اینکه قطعه‌تان خراب شود.',
          ),
        ],
        [
          t('Do you ship outside Tehran?', 'به شهرستان ارسال دارید؟'),
          t(
            'Yes, everywhere in Iran by post or courier, packed so that nothing arrives chipped.',
            'بله، به سراسر ایران با پست یا پیک، با بسته‌بندی‌ای که هیچ‌چیز شکسته نرسد.',
          ),
        ],
      ].map(([q, a]) => ({ q: q(l), a: a(l) })),
    },
  },
  {
    id: 'order',
    type: 'contact-form',
    props: {
      anchor: 'order',
      title: t('Send us your design', 'طرحتان را برایمان بفرستید')(l),
      text: t(
        'Tell us what you’d like printed and how many. We’ll reply within one working day with a mock-up and a price.',
        'بگویید چه چیزی و چند عدد می‌خواهید. ظرف یک روز کاری با پیش‌نمایش و قیمت پاسخ می‌دهیم.',
      )(l),
      fields: [
        { label: t('Name', 'نام')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Phone', 'تلفن همراه')(l), type: 'tel', required: true, options: '', placeholder: '' },
        { label: t('Email', 'ایمیل')(l), type: 'email', required: false, options: '', placeholder: '' },
        {
          label: t('Product', 'محصول')(l),
          type: 'select',
          required: true,
          options: t(
            'Mug, T-shirt, Team kit, Phone case, Metal photo panel, Cushion, Puzzle, Something else',
            'ماگ, تی‌شرت, لباس تیمی, قاب موبایل, تابلو فلزی, کوسن, پازل, چیز دیگر',
          )(l),
          placeholder: '',
        },
        { label: t('How many?', 'تعداد')(l), type: 'text', required: false, options: '', placeholder: t('e.g. 12', 'مثلاً ۱۲')(l) },
        {
          label: t('Your idea', 'ایده‌ی شما')(l),
          type: 'textarea',
          required: true,
          options: '',
          placeholder: t('A link to your design, or describe it…', 'لینک طرح یا توضیح آن…')(l),
        },
      ],
      submitLabel: t('Send', 'ارسال')(l),
      successMessage: t('Thank you! We’ll be in touch within one working day.', 'ممنون! ظرف یک روز کاری با شما تماس می‌گیریم.')(l),
    },
  },
  {
    id: 'motto',
    type: 'scroll-marquee',
    props: {
      rows: [
        { text: t('Mugs · T-shirts · Kits · Panels · Cushions', 'ماگ · تی‌شرت · لباس تیمی · تابلو · کوسن')(l), style: 'solid' },
        { text: 'FikkoPrint', style: 'outline' },
        { text: t('Printed into, not onto', 'درونِ جسم، نه رویش')(l), style: 'accent' },
      ],
      speed: 'medium',
      look: 'dark',
    },
  },
  {
    id: 'contact',
    type: 'contact-footer',
    props: {
      anchor: 'contact',
      title: t('Got a photo you love?', 'عکسی دارید که دوستش دارید؟')(l),
      text: t(
        'Give it a second life on a mug, a shirt or a panel. Write to us, or visit the workshop and watch the presses at work.',
        'به آن زندگی دوباره بدهید؛ روی ماگ، لباس یا تابلو. برایمان بنویسید، یا به کارگاه بیایید و کار پرس‌ها را از نزدیک ببینید.',
      )(l),
      email: EMAIL,
      phone: '',
      address: t('Tehran, Iran · Shipping everywhere in Iran', 'تهران · ارسال به سراسر ایران')(l),
      copyright: t('© FikkoPrint · fikkoprint.com', '© فیکوپرینت · fikkoprint.com')(l),
    },
  },
];

// ---------- Save ----------
const atelier = LOOK === 'atelier' ? await atelierContent({ sharp, up, product, step }) : null;
const animatedTheme = {
  primary: '#e6007e',
  secondary: '#00a0e9',
  dark: '#0d0b14',
  background: '#0d0b14',
  headerStyle: 'glass',
  cursor: 'default',
  pageTransition: 'curtain',
};
const theme = atelier?.theme ?? animatedTheme;
const titles = {
  en: 'FikkoPrint — Sublimation printing',
  fa: 'فیکوپرینت — چاپ سابلیمیشن',
};
const seo = {
  en: {
    seoTitle: 'Sublimation printing on mugs, T-shirts and more | FikkoPrint',
    seoDescription:
      'FikkoPrint prints only by sublimation: mugs, polyester T-shirts, team kits, phone cases, metal photo panels and cushions. Single pieces or wholesale, shipped across Iran.',
  },
  fa: {
    seoTitle: 'چاپ سابلیمیشن روی ماگ، تی‌شرت و بیشتر | فیکوپرینت',
    seoDescription:
      'فیکوپرینت فقط چاپ سابلیمیشن انجام می‌دهد: ماگ، تی‌شرت پلی‌استر، لباس تیمی، قاب موبایل، تابلو فلزی و کوسن. تکی یا عمده، با ارسال به سراسر ایران.',
  },
};
const LOCALES = ['en', 'fa'];
// The news collection and its items; running again updates them in place.
const NEWS_FIELDS = [
  { key: 'newsDate', label: 'News date', type: 'text', labels: { fa: 'تاریخ خبر' } },
  { key: 'source', label: 'Source', type: 'text', labels: { fa: 'منبع' } },
  { key: 'link', label: 'Read the original', type: 'url', labels: { fa: 'خبر اصلی' } },
];
const collections = await api('GET', '/admin/collections');
let news = collections.find((c) => c.key === 'news');
const newsInfo = { name: { en: 'News', fa: 'اخبار' }, slugs: { en: 'news', fa: 'اخبار' }, fields: NEWS_FIELDS };
if (news) await api('PATCH', `/admin/collections/${news.id}`, newsInfo);
else news = await api('POST', '/admin/collections', { key: 'news', ...newsInfo });
const existing = await api('GET', `/admin/collections/${news.id}/items`);
// Oldest first, so the newest story is published last and shows first.
for (const [i, n] of NEWS.entries()) {
  const item =
    existing.find((x) => x.translations?.some((tr) => tr.locale === 'en' && tr.slug === n.slug.en)) ??
    (await api('POST', `/admin/collections/${news.id}/items`, { title: n.en.title }));
  await api('PATCH', `/admin/collections/${news.id}/items/${item.id}`, {
    cover: newsCovers[i],
    translations: LOCALES.map((l) => ({
      locale: l,
      slug: n.slug[l],
      title: n[l].title,
      excerpt: n[l].excerpt,
      body: n[l].body,
      tags: n.tags[l],
      data: { newsDate: n.date[l], source: n.source, link: n.link },
      seoDescription: n[l].excerpt,
    })),
  });
  await api('POST', `/admin/collections/${news.id}/items/${item.id}/publish`);
}

const pages = await api('GET', '/admin/pages');
let page;
let slugs;

if (HOME) {
  page = pages.find((p) => p.isHome);
  slugs = Object.fromEntries(LOCALES.map((l) => [l, page.translations.find((x) => x.locale === l)?.slug ?? '']));
  const settings = await api('GET', '/admin/settings');
  await api('PUT', '/admin/settings', {
    siteName: { fa: 'فیکوپرینت', en: 'FikkoPrint' },
    logo: logoUrl,
    favicon: settings.favicon,
    theme: { ...settings.theme, ...theme },
    menu: atelier?.menu ?? [
      { href: '#process', label: { fa: 'فرایند چاپ', en: 'How it works' } },
      { href: '#products', label: { fa: 'محصولات', en: 'Products' } },
      { href: '#materials', label: { fa: 'جنس‌ها', en: 'Materials' } },
      { href: '#prices', label: { fa: 'قیمت‌ها', en: 'Prices' } },
      { href: '#news', label: { fa: 'اخبار', en: 'News' } },
      { href: '#faq', label: { fa: 'پرسش‌ها', en: 'FAQ' } },
      { href: '#order', label: { fa: 'سفارش', en: 'Order' } },
    ],
    fonts: settings.fonts,
    savedThemes: settings.savedThemes,
    loader: settings.loader,
    maintenance: settings.maintenance,
    maintenanceText: settings.maintenanceText,
    business: {
      ...settings.business,
      email: EMAIL,
      city: 'Tehran',
      region: 'Tehran',
      country: 'IR',
    },
    notifyEmail: settings.notifyEmail,
  });
} else {
  const NAME = 'FikkoPrint sublimation printing';
  page = pages.find((p) => p.name === NAME) ?? (await api('POST', '/admin/pages', { name: NAME }));
  slugs = { en: 'sublimation-printing', fa: 'چاپ-سابلیمیشن' };
}

await api('PATCH', `/admin/pages/${page.id}`, {
  name: page.name,
  // On its own page the colors belong to the page; with --home they are the site's.
  theme: HOME ? null : theme,
  translations: LOCALES.map((l) => ({ locale: l, slug: slugs[l], title: titles[l], ...seo[l], blocks: (atelier?.blocks ?? blocks)(l) })),
});
await api('POST', `/admin/pages/${page.id}/publish`);
console.log(`Published: ${LOCALES.map((l) => `/${l}/${slugs[l]}`).join('  ')}`);
