/**
 * Builds Kasra Haghdoust's portfolio (kasradesignstudio.com) in Persian and English from the pictures of his old site
 * (https://github.com/hesamtmg/kasra): a home page that tells his story as a graphic designer, mostly with animated
 * blocks, and one page per kind of work. Every picture of the old site is uploaded and used, each kind in its own
 * media folder. It only talks to the admin API, so it works against a local site or a live one.
 *
 *   node scripts/seed-kasra.mjs --images ../kasra           the story on its own page, /fa/kasra and /en/kasra (safe)
 *   node scripts/seed-kasra.mjs --images ../kasra --home    the story on the home page, and the site name, logo, menu
 *                                                           and colors set for Kasra
 *
 * --images is a checkout of the kasra repository, or its kasra-app/public/image folder (KASRA_IMAGES works too).
 * The work pages are /{fa,en}/identity, logos, low-poly, low-poly-process, nft, illustration and pop-art.
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD, and SITE (the site's address)
 * when the installation has several sites.
 * Running it again updates the same pages and reuses the pictures it already uploaded.
 * On the server, see the "Kasra content" section of DEPLOY.md.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
// With several sites, the one to fill: its address, e.g. SITE=kasradesignstudio.com (sent as X-Forwarded-Host).
const SITE = process.env.SITE ? { 'x-forwarded-host': process.env.SITE } : {};
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const HOME = args.includes('--home');
const DRY = args.includes('--dry-run');

/** The folder that holds Bio.jpg, Logo/, NFT/…: the repository's kasra-app/public/image, or the folder itself. */
function imageRoot() {
  const given = resolve(option('images') ?? process.env.KASRA_IMAGES ?? new URL('../../kasra', import.meta.url).pathname);
  for (const dir of [join(given, 'kasra-app/public/image'), given]) if (existsSync(join(dir, 'Bio.jpg'))) return dir;
  throw new Error(`Kasra's pictures not found in ${given}: pass --images with a checkout of github.com/hesamtmg/kasra`);
}
const ROOT = imageRoot();

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

// ---------- The work ----------
const t = (en, fa) => (l) => (l === 'en' ? en : fa);

/** Each kind of work: its folder in the old site, its page here, and its words. */
const KINDS = [
  {
    key: 'identity',
    dir: 'Corporate Identity',
    slug: 'identity',
    name: t('Corporate identity', 'هویت بصری'),
    short: t('Formal collections', 'مجموعه‌های رسمی'),
    cover: 'Natural Paper Printed Logo MockUp.jpg',
    color: '#e11d74',
    text: t(
      'A logo is only the first word. Business cards, envelopes, cups, bags, signs and packaging have to speak the same language, so a brand feels like one person wherever you meet it.',
      'لوگو فقط کلمه‌ی اول است. کارت ویزیت، پاکت نامه، لیوان، ساک خرید، تابلو و بسته‌بندی باید همه به یک زبان حرف بزنند تا یک برند هر جا که دیده شود، یک شخصیت داشته باشد.',
    ),
  },
  {
    key: 'logos',
    dir: 'Logo',
    slug: 'logos',
    name: t('Logos', 'لوگو'),
    short: t('Logo collection', 'مجموعه‌ی لوگو'),
    cover: 'zhakar-01.jpg',
    color: '#f5c400',
    text: t(
      'Thirteen marks, each drawn twice: once in full color, and once in a single grey to prove it still works without help. Persian calligraphy, pixels, leaves and palm trees, all reduced to what matters.',
      'سیزده نشانه که هر کدام دو بار کشیده شده‌اند: یک بار با همه‌ی رنگ‌ها و یک بار فقط با یک خاکستری، تا ثابت شود بدون کمک هم کار می‌کنند. خوشنویسی فارسی، پیکسل، برگ و نخل؛ همه خلاصه‌شده تا جایی که فقط اصل حرف بماند.',
    ),
  },
  {
    key: 'lowpoly',
    dir: 'Low Poly',
    slug: 'low-poly',
    name: t('Low poly portraits', 'پرتره‌های لوپلی'),
    short: t('People', 'آدم‌ها'),
    cover: 'gilmour.jpg',
    color: '#0ea5e9',
    text: t(
      'Faces built from hundreds of flat triangles. Some are legends — Shajarian, Shamlou, Entezami, David Gilmour — and some are the people closest to Kasra: his mother, his friends, himself.',
      'چهره‌هایی ساخته‌شده از صدها مثلث تخت. بعضی‌شان اسطوره‌اند — شجریان، شاملو، انتظامی، دیوید گیلمور — و بعضی نزدیک‌ترین آدم‌های زندگی کسری: مادرش، دوستانش و خودش.',
    ),
  },
  {
    key: 'process',
    dir: 'Low Poly Process',
    slug: 'low-poly-process',
    name: t('Low poly, step by step', 'لوپلی، قدم به قدم'),
    short: t('Behind the scenes', 'پشت صحنه'),
    cover: 'IMG_5120.JPG',
    color: '#22c55e',
    text: t(
      'Every portrait starts as a net of thin lines over a photograph. Then, triangle by triangle, each one is filled with a single flat color until the face appears.',
      'هر پرتره با توری از خط‌های نازک روی یک عکس شروع می‌شود. بعد، مثلث به مثلث، هر کدام با یک رنگ تخت پر می‌شود تا چهره کم‌کم پیدا شود.',
    ),
  },
  {
    key: 'nft',
    dir: 'NFT',
    slug: 'nft',
    name: t('NFT', 'ان‌اف‌تی'),
    short: t('Future', 'آینده'),
    cover: 'Opensea Series 1.jpg',
    color: '#8b5cf6',
    text: t(
      'Low poly animals, imaginary planets and a herd of crystal beasts reflected on black glass — minted on Hic et Nunc, Kalamint and OpenSea.',
      'حیوان‌های لوپلی، سیاره‌های خیالی و گله‌ای از جانورهای بلورین که روی شیشه‌ی سیاه منعکس شده‌اند؛ ضرب‌شده در هیک ات نانک، کالامینت و اوپن‌سی.',
    ),
  },
  {
    key: 'illustration',
    dir: 'Illustration',
    slug: 'illustration',
    name: t('Illustration', 'تصویرسازی'),
    short: t('Simple thoughts', 'فکرهای ساده'),
    cover: 'ps5-01.jpg',
    color: '#f97316',
    text: t(
      'Game controllers, skateboards, Woody and Buzz, a pixel mushroom and Sonic: the things a kid of the nineties grew up with, drawn flat, bright and clean.',
      'دسته‌ی بازی، اسکیت‌بورد، وودی و باز، قارچ پیکسلی و سونیک: چیزهایی که یک بچه‌ی دهه‌ی هفتاد با آن‌ها بزرگ شد، تخت و روشن و تمیز کشیده شده‌اند.',
    ),
  },
  {
    key: 'popart',
    dir: 'PopArt',
    slug: 'pop-art',
    name: t('Pop art', 'پاپ‌آرت'),
    short: t('Print', 'چاپ'),
    cover: 'pop art-04.jpg',
    color: '#ec4899',
    text: t(
      'A portrait cut into bold shards of color, in the WPAP style: hard edges, no gradients, and colors louder than life.',
      'پرتره‌ای که به تکه‌های جسور رنگی بریده شده، به سبک WPAP: لبه‌های تیز، بدون سایه‌روشن و رنگ‌هایی بلندتر از واقعیت.',
    ),
  },
];
const kind = Object.fromEntries(KINDS.map((k) => [k.key, k]));

/** Names for the pictures whose file names say little. The rest get a tidied file name. */
const BRAND = {
  aqaj: t('Aghaj', 'آغاج'),
  arx: t('ARX Deco', 'آرکس دکو'),
  'arx 2': t('ARX Company', 'شرکت آرکس'),
  bb: t('Beauty Bar', 'بیوتی بار'),
  cgp: t('Golden Canvas PMU', 'گلدن کانواس'),
  dd: t('Dava Doctor', 'دوا دکتر'),
  hg: t('Haj Gadget', 'حاج گجت'),
  lafik: t('Lafik', 'لافیک'),
  mot1: t('Motaf · calligraphy', 'مطاف · خوشنویسی'),
  mot2: t('Motaf · Kufic', 'مطاف · کوفی'),
  mot3: t('Motaf · Kufic, light', 'مطاف · کوفی سبک'),
  ws: t('Wonder Skull', 'واندر اسکال'),
  zhakar: t('Zhakar Handmade', 'ژاکار هندمید'),
};
const BRAND_KIND = {
  aqaj: t('Persian lettering in a willow', 'حروف فارسی در دل یک بید'),
  arx: t('Interior design', 'طراحی داخلی'),
  'arx 2': t('Architecture', 'معماری'),
  bb: t('Skincare consultant', 'مشاور پوست'),
  cgp: t('Permanent make-up studio', 'استودیوی آرایش دائم'),
  dd: t('Online pharmacy', 'داروخانه‌ی آنلاین'),
  hg: t('Gadget shop', 'فروشگاه گجت'),
  lafik: t('A palm made of letters', 'نخلی از حروف'),
  mot1: t('Calligraphic logotype', 'لوگوتایپ خوشنویسی'),
  mot2: t('Square Kufic logotype', 'لوگوتایپ کوفی بنایی'),
  mot3: t('Square Kufic logotype', 'لوگوتایپ کوفی بنایی'),
  ws: t('Pixel-art coffee brand', 'برند قهوه با پیکسل‌آرت'),
  zhakar: t('Handmade goods', 'محصولات دست‌ساز'),
};
const NAMES = {
  identity: {
    '13_April_02.jpg': t('ARX Company folder', 'فولدر شرکت آرکس'),
    '1652-Recovered.jpg': t('Plus Store business cards', 'کارت ویزیت پلاس استور'),
    '4873199.jpg': t('Wonder Skull on paper', 'واندر اسکال روی کاغذ'),
    '76478.jpg': t('Kasra’s own cards and phone', 'کارت و گوشی خود کسری'),
    'ARX MOCKUP.jpg': t('ARX Deco letterhead', 'سربرگ آرکس دکو'),
    'Asset 8@300x-100.jpg': t('Zhakar business cards', 'کارت ویزیت ژاکار'),
    'Asset 8_1@300x-100.jpg': t('Zhakar letterhead and note paper', 'سربرگ و یادداشت ژاکار'),
    'Asset 9@300x-100.jpg': t('Zhakar CD and cover', 'سی‌دی و جلد ژاکار'),
    'Asset 10_1@300x-100.jpg': t('Zhakar envelopes', 'پاکت‌نامه‌های ژاکار'),
    'Asset 11@300x-100.jpg': t('Zhakar pictograms', 'پیکتوگرام‌های ژاکار'),
    'Asset 12@300x-100.jpg': t('Zhakar wayfinding sign', 'تابلوی راهنمای ژاکار'),
    'Asset 13_1@300x-100.jpg': t('Zhakar cards', 'کارت‌های ژاکار'),
    'Asset 14_1@300x-100.jpg': t('Zhakar letterhead', 'سربرگ ژاکار'),
    'Asset 15_2@300x-100.jpg': t('Zhakar card and CD', 'کارت و سی‌دی ژاکار'),
    'Asset 16@300x-100.jpg': t('Zhakar envelope', 'پاکت ژاکار'),
    'Asset 17@300x-100.jpg': t('Zhakar shopping bag', 'ساک خرید ژاکار'),
    'Asset 18@300x-100.jpg': t('Zhakar mug', 'ماگ ژاکار'),
    'Asset 18_1@300x-100.jpg': t('Zhakar logo, debossed', 'لوگوی برجسته‌ی ژاکار'),
    'Asset 19@300x-100.jpg': t('Zhakar stationery set', 'ست اداری ژاکار'),
    'Business Card Preview.jpg': t('Plus Store, front and back', 'پلاس استور، رو و پشت کارت'),
    'Business Cards With Wooden Board-Recovered.jpg': t('Plus Store on wood', 'پلاس استور روی چوب'),
    'Golden_Logo_on_Black_Textured_Paper_Mockup (2).jpg': t('Motaf in gold', 'مطاف با طلاکوب'),
    'Golden_Logo_on_Black_Textured_Paper_Mockup.jpg': t('Golden Canvas in gold', 'گلدن کانواس با طلاکوب'),
    'IMG_20171113_145311_570.jpg': t('Black Army, 2017', 'بلک آرمی، ۱۳۹۶'),
    'IMG_20171113_145311_571.jpg': t('Black Army on paper', 'بلک آرمی روی کاغذ'),
    'IMG_20171209_142951_396.jpg': t('Liana Laser & Beauty Center', 'مرکز لیزر و زیبایی لیانا'),
    'Natural Paper Printed Logo MockUp.jpg': t('Kasra’s own mark', 'نشان شخصی کسری'),
    'PEVUO01-Recovered.jpg': t('Plus Store stationery', 'ست اداری پلاس استور'),
    'Products_Mockup_2s.jpg': t('Wonder Skull coffee bags', 'بسته‌بندی قهوه‌ی واندر اسکال'),
    'b b mockup.jpg': t('Beauty Bar logo', 'لوگوی بیوتی بار'),
    'business card mockup.jpg': t('ARX Design & Construction card', 'کارت آرکس طراحی و ساخت'),
    'card mockup 1.jpg': t('Beauty Bar cards', 'کارت‌های بیوتی بار'),
    'card mockup 2.jpg': t('Beauty Bar card', 'کارت بیوتی بار'),
    'card.jpg': t('Golden Canvas cards', 'کارت‌های گلدن کانواس'),
    'cup-28.jpg': t('Wonder Skull cups', 'لیوان‌های واندر اسکال'),
    'photo_2017-11-11_21-49-14.jpg': t('Zhakar, the whole identity', 'ژاکار، کل هویت بصری'),
  },
  lowpoly: {
    'Kiana-01.jpg': t('Kiana', 'کیانا'),
    'Najafi-02.jpg': t('Najafi', 'نجفی'),
    'Present 1.jpg': t('“The trick to having a happy life…”, framed', '«راز یک زندگی شاد…»، قاب‌شده'),
    'Present 2.jpg': t('Gilmour triptych on the wall', 'سه‌گانه‌ی گیلمور روی دیوار'),
    'Shajarian.jpg': t('Mohammad-Reza Shajarian', 'محمدرضا شجریان'),
    'david gilmour-02.jpg': t('David Gilmour', 'دیوید گیلمور'),
    'entezami-01.jpg': t('Ezzatollah Entezami', 'عزت‌الله انتظامی'),
    'gilmour.jpg': t('David Gilmour, framed', 'دیوید گیلمور، قاب‌شده'),
    'helia-01.jpg': t('Helia', 'هلیا'),
    'khosro-04.jpg': t('Khosrow Shakibai', 'خسرو شکیبایی'),
    'me-02.jpg': t('Kasra, by himself', 'کسری، به قلم خودش'),
    'mom-01.jpg': t('Mom', 'مادر'),
    'nasim-01.jpg': t('Nasim', 'نسیم'),
    'nima-01.jpg': t('Nima', 'نیما'),
    'saqar2-03-02.jpg': t('Saghar', 'ساغر'),
    'shamloo-02.jpg': t('Ahmad Shamlou', 'احمد شاملو'),
  },
  process: {
    'IMG_5116.JPG': t('Saghar, from lines to color', 'ساغر، از خط تا رنگ'),
    'IMG_5117.JPG': t('Nima, from lines to color', 'نیما، از خط تا رنگ'),
    'IMG_5118.JPG': t('Helia, from lines to color', 'هلیا، از خط تا رنگ'),
    'IMG_5119.JPG': t('Kiana, from lines to color', 'کیانا، از خط تا رنگ'),
    'IMG_5120.JPG': t('Shajarian, from lines to color', 'شجریان، از خط تا رنگ'),
    'IMG_5121.JPG': t('Shamlou, from lines to color', 'شاملو، از خط تا رنگ'),
    'IMG_5134.JPG': t('Shakibai, from lines to color', 'شکیبایی، از خط تا رنگ'),
    'IMG_5135.JPG': t('Entezami, from lines to color', 'انتظامی، از خط تا رنگ'),
    'IMG_5136.JPG': t('Najafi, from lines to color', 'نجفی، از خط تا رنگ'),
  },
  illustration: {
    'IMG_2192-01.jpg': t('Desert night', 'شب کویر'),
    'Mushroom-01.jpg': t('Pixel mushroom', 'قارچ پیکسلی'),
    'Untitled (2).jpg': t('Sonic in a grid', 'سونیک در شطرنجی'),
    'Untitled 2.jpg': t('Woody, the sketch', 'وودی، طرح خطی'),
    'Untitled-1-01 (2).jpg': t('PlayStation pad on orange', 'دسته‌ی پلی‌استیشن روی نارنجی'),
    'Untitled-1-01 (3).jpg': t('Skateboard, top view', 'اسکیت‌بورد از بالا'),
    'Untitled-1-01.jpg': t('Why so serious?', 'چرا این‌قدر جدی؟'),
    'Untitled-1-02.jpg': t('PlayStation pad on blue', 'دسته‌ی پلی‌استیشن روی آبی'),
    'Untitled-11-01.jpg': t('Skateboard on cyan', 'اسکیت‌بورد روی فیروزه‌ای'),
    'Untitled-2-01.jpg': t('Xbox pad on green', 'دسته‌ی ایکس‌باکس روی سبز'),
    'Untitled-2.jpg': t('Joy-Con in neon', 'جوی‌کان نئونی'),
    'Untitled.jpg': t('Buzz, the sketch', 'باز، طرح خطی'),
    'black-01-01.jpg': t('Xbox pad on yellow', 'دسته‌ی ایکس‌باکس روی زرد'),
    'buzz-01.jpg': t('To infinity and beyond', 'به سوی بی‌نهایت و فراتر از آن'),
    'faces1.jpg': t('Moods, pink', 'حال‌ها، صورتی'),
    'faces2.jpg': t('Moods, blue', 'حال‌ها، آبی'),
    'faces3.jpg': t('Moods, green', 'حال‌ها، سبز'),
    'ps5-01.jpg': t('DualSense, white', 'دوال‌سنس سفید'),
    'ps5-02.jpg': t('DualSense, black', 'دوال‌سنس مشکی'),
    'sonic-01.jpg': t('Sonic', 'سونیک'),
    'woody-01.jpg': t('Reach for the sky', 'دست‌ها بالا'),
  },
  nft: {
    'HEN Animal Series 1.jpg': t('Hic et Nunc animals, series 1', 'حیوان‌های هیک ات نانک، سری ۱'),
    'HEN Animal Series 2.jpg': t('Hic et Nunc animals, series 2', 'حیوان‌های هیک ات نانک، سری ۲'),
    'HEN Animal Series 3.jpg': t('Hic et Nunc animals, series 3', 'حیوان‌های هیک ات نانک، سری ۳'),
    'Kalamin Planets Series 1.jpg': t('Kalamint planets, series 1', 'سیاره‌های کالامینت، سری ۱'),
    'Kalamint Planet Series 2.jpg': t('Kalamint planets, series 2', 'سیاره‌های کالامینت، سری ۲'),
    'Opensea Series 1.jpg': t('OpenSea herd, series 1', 'گله‌ی اوپن‌سی، سری ۱'),
    'Opensea Series 2.jpg': t('OpenSea herd, series 2', 'گله‌ی اوپن‌سی، سری ۲'),
    'Rihno.jpg': t('Rhino', 'کرگدن'),
  },
  popart: {
    'pop art-03.jpg': t('Pop art portrait, first cut', 'پرتره‌ی پاپ‌آرت، نسخه‌ی اول'),
    'pop art-04.jpg': t('Pop art portrait, final', 'پرتره‌ی پاپ‌آرت، نسخه‌ی نهایی'),
  },
};
const FA_ANIMAL = {
  Bear: 'خرس',
  Bull: 'گاو نر',
  Eagle: 'عقاب',
  Elephant: 'فیل',
  Fox: 'روباه',
  Giraffe: 'زرافه',
  Koala: 'کوالا',
  Lion: 'شیر',
  Monkey: 'میمون',
  Owl: 'جغد',
  Panda: 'پاندا',
  Pig: 'خوک',
  Tiger: 'ببر',
  wolf: 'گرگ',
  Wolf: 'گرگ',
  Mammoth: 'ماموت',
  Unicorn: 'تک‌شاخ',
};

/** A picture's caption: from the lists above, or made from its file name. */
function caption(k, file, l) {
  const known = NAMES[k]?.[file];
  if (known) return known(l);
  const base = file.replace(/\.[a-z]+$/i, '');
  if (k === 'logos') {
    const [, brand, n] = base.match(/^(.*?)-0?(\d)$/) ?? [];
    const version = n === '1' ? t('color', 'رنگی')(l) : t('one color', 'تک‌رنگ')(l);
    return `${BRAND[brand](l)} · ${version}`;
  }
  if (k === 'nft') {
    const planet = base.match(/^Planet\s+(.*)$/);
    if (planet) return l === 'en' ? `Planet ${planet[1].replace(/-01$/, '')}` : `سیاره‌ی ${planet[1].replace(/-01$/, '')}`;
    const lp = base.match(/^Low Poly (.*)$/);
    const animal = lp ? lp[1] : base;
    if (l === 'en') return lp ? `Low poly ${animal.toLowerCase()}` : `${animal}, on black glass`;
    return lp ? `${FA_ANIMAL[animal]} لوپلی` : `${FA_ANIMAL[animal]}، روی شیشه‌ی سیاه`;
  }
  return base;
}

// ---------- API ----------
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
if (!DRY) {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...SITE },
    body: JSON.stringify(ADMIN),
  });
  if (!login.ok) throw new Error(`login failed (${login.status}): check API_URL, ADMIN_EMAIL and ADMIN_PASSWORD`);
  token = (await login.json()).token;
}

/** Pictures already in a media folder, by their file name, so running again does not upload them twice. */
const existing = new Map();
async function loadFolder(folder) {
  if (DRY || existing.has(folder)) return;
  const items = await api('GET', `/admin/media?folder=${encodeURIComponent(folder)}`);
  existing.set(folder, new Map(items.map((m) => [m.originalName, m.url])));
}

/** Uploads a picture made by `make` into a media folder, unless the folder already has one with that name. */
async function upload(make, name, type, folder) {
  await loadFolder(folder);
  const found = existing.get(folder)?.get(name);
  if (found) return found;
  if (DRY) return `/uploads/dry-run/${encodeURIComponent(name)}`;
  const fd = new FormData();
  fd.append('file', new Blob([await make()], { type }), name);
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...SITE }, body: fd });
  if (!res.ok) throw new Error(`upload ${name}: ${res.status} ${await res.text()}`);
  const media = await res.json();
  await api('PATCH', `/admin/media/${media.id}`, { folder });
  existing.get(folder).set(name, media.url);
  return media.url;
}

/** Large camera and print files are made at most 2400 px wide; the site makes its own smaller copies. */
const web = (input) =>
  sharp(input)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

// ---------- Uploading every picture ----------
const pics = {}; // kind key → file name → url
const files = {}; // kind key → file names, in the old site's order
const used = new Set();
let uploaded = 0;
async function uploadKind(key, dir, folder) {
  const path = dir ? join(ROOT, dir) : ROOT;
  files[key] = readdirSync(path)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  pics[key] = {};
  for (const f of files[key]) {
    pics[key][f] = await upload(() => web(readFileSync(join(path, f))), f.replace(/\.JPG$/, '.jpg'), 'image/jpeg', folder);
    process.stdout.write(`\r${++uploaded} pictures ready`);
  }
}
await uploadKind('about', '', 'Kasra · About');
for (const k of KINDS) await uploadKind(k.key, k.dir, `Kasra · ${k.name('en')}`);
console.log();

/** A picture's address; also notes that it is used, so the end of the script can prove every picture is. */
function pic(key, file) {
  const url = pics[key]?.[file];
  if (!url) throw new Error(`No picture "${file}" in ${key}`);
  used.add(url);
  return url;
}
const photo = (key, file, l) => ({ image: pic(key, file), caption: caption(key, file, l) });

/** The first and last steps of a process sheet (2 × 2: lines, half, nearly, done), cut out for a before/after slider. */
async function processPair(file, name) {
  const src = join(ROOT, kind.process.dir, file);
  const { width, height } = await sharp(src).metadata();
  const w = Math.floor(width / 2);
  const h = Math.floor(height / 2);
  const part = (left, top) =>
    sharp(src).extract({ left, top, width: w, height: h }).resize({ width: 1400 }).jpeg({ quality: 86 }).toBuffer();
  const folder = `Kasra · ${kind.process.name('en')}`;
  return {
    lines: await upload(() => part(0, 0), `${name}-lines.jpg`, 'image/jpeg', folder),
    done: await upload(() => part(width - w, height - h), `${name}-done.jpg`, 'image/jpeg', folder),
  };
}
const shajarian = await processPair('IMG_5120.JPG', 'shajarian');
const najafi = await processPair('IMG_5136.JPG', 'najafi');

/** Kasra's mark on a transparent background, for the header: the white of the JPG becomes see-through. */
async function transparentLogo(file) {
  const { data, info } = await sharp(join(ROOT, file)).trim({ threshold: 10 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const light = Math.min(data[i], data[i + 1], data[i + 2]);
    if (light > 235) data[i + 3] = 0;
    else if (light > 200) data[i + 3] = Math.round(((235 - light) / 35) * 255);
  }
  return upload(
    () => sharp(data, { raw: info }).resize({ height: 240 }).png().toBuffer(),
    `${file.replace(/\.jpg$/, '')}-transparent.png`,
    'image/png',
    'Kasra · About',
  );
}

// ---------- Shared pieces ----------
const EMAIL = 'kasra.igraphist@gmail.com';
const PHONE = '+989373958660';
const count = (key) => files[key].length;
const total = KINDS.reduce((n, k) => n + count(k.key), 0);
const brands = [...new Set(files.logos.map((f) => f.replace(/-0?\d\.jpg$/, '')))];
const href = (k) => k.slug;

const contactFooter = (l) => ({
  id: 'footer',
  type: 'contact-footer',
  props: {
    anchor: 'contact',
    title: t('Have a brand that needs a face?', 'برندی دارید که چهره می‌خواهد؟')(l),
    text: t(
      'Logos, identities, illustrations and portraits. Tell Kasra what you are making, and he will tell you how it could look.',
      'لوگو، هویت بصری، تصویرسازی و پرتره. به کسری بگویید چه می‌سازید، او به شما می‌گوید چطور می‌تواند دیده شود.',
    )(l),
    email: EMAIL,
    phone: t('+98 937 395 8660', '۰۹۳۷۳۹۵۸۶۶۰')(l),
    address: t('Iran · working with clients everywhere', 'ایران · همکاری با مشتری‌ها از هر جای دنیا')(l),
    copyright: t('© Kasra Haghdoust · Kasra Design Studio', '© کسری حق‌دوست · استودیو طراحی کسری')(l),
  },
});

/** Links to the other kinds of work, at the end of each work page. */
const moreWork = (current, l) => ({
  id: 'more',
  type: 'hover-list',
  props: {
    animation: 'rise',
    title: t('More work', 'کارهای دیگر')(l),
    items: KINDS.filter((k) => k.key !== current).map((k) => ({
      image: pic(k.key, k.cover),
      title: k.name(l),
      meta: t(`${count(k.key)} pieces`, `${count(k.key).toLocaleString('fa-IR')} اثر`)(l),
      link: href(k),
    })),
  },
});

const fullGallery = (key, l, title) => ({
  id: 'gallery',
  type: 'gallery',
  props: {
    anchor: 'all',
    animation: 'fade',
    title,
    layout: 'masonry',
    columns: key === 'logos' ? '4' : '3',
    images: files[key].map((f) => photo(key, f, l)),
  },
});

// ---------- The home page: Kasra's story ----------
const story = (l) => [
  {
    id: 'hero',
    type: 'aurora-hero',
    props: {
      anchor: 'top',
      eyebrow: t('Kasra Haghdoust · Graphic designer', 'کسری حق‌دوست · طراح گرافیک')(l),
      title: t('I turn ideas into', 'ایده‌ها را تبدیل می‌کنم به')(l),
      words: t('logos,identities,low poly portraits,illustrations,NFT worlds', 'لوگو,هویت بصری,پرتره‌ی لوپلی,تصویرسازی,دنیای ان‌اف‌تی')(l),
      text: t(
        'Minimal shapes, bold colors and a lot of triangles. This is the story of how an industrial designer became everyone’s favorite graphic designer.',
        'شکل‌های مینیمال، رنگ‌های جسور و کلی مثلث. این داستان یک طراح صنعتی است که همه او را طراح گرافیک می‌شناسند.',
      )(l),
      buttonLabel: t('See the work', 'دیدن کارها')(l),
      buttonLink: '#works',
      secondButtonLabel: t('Hire me', 'همکاری با من')(l),
      secondButtonLink: '#contact',
      color: '#f5c400',
      look: 'dark',
    },
  },
  {
    id: 'hello',
    type: 'split-reveal',
    props: {
      anchor: 'about',
      image: pic('about', 'Cover.jpg'),
      coverTitle: t('Hello.', 'سلام.')(l),
      eyebrow: t('Who I am', 'من کی هستم')(l),
      title: t('I’m Kasra, a visual designer based in Iran.', 'من کسری هستم؛ طراح بصری، ساکن ایران.')(l),
      text: t(
        'Born in 1992. I studied industrial design at Tabriz Islamic Art University, and although my degree says industrial designer, everyone knows me as a graphic designer.',
        'متولد ۱۳۷۱. طراحی صنعتی را در دانشگاه هنر اسلامی تبریز خواندم و با اینکه مدرکم طراحی صنعتی است، همه مرا طراح گرافیک می‌شناسند.',
      )(l),
      buttonLabel: t('Read my story', 'داستانم را بخوانید')(l),
      buttonLink: '#story',
      direction: 'sideways',
    },
  },
  {
    id: 'story',
    type: 'scroll-text',
    props: {
      anchor: 'story',
      eyebrow: t('Chapter one · From objects to images', 'فصل اول · از اشیا تا تصویرها')(l),
      text: t(
        'At university I learned how things are made: proportion, material, the way a hand holds an object. Somewhere between sketches of chairs and lamps, I realised the part I loved most was the flat drawing on the page — the shape, the color, the logo on the side of the box. So I kept drawing.',
        'در دانشگاه یاد گرفتم اشیا چطور ساخته می‌شوند: تناسب، جنس، اینکه دست چطور یک شیء را می‌گیرد. جایی میان طرح‌های صندلی و چراغ فهمیدم چیزی که بیش از همه دوستش دارم، همان طرح تخت روی کاغذ است؛ شکل، رنگ، لوگویی که روی جعبه می‌نشیند. پس به کشیدن ادامه دادم.',
      )(l),
    },
  },
  {
    id: 'badge',
    type: 'spinning-badge',
    props: {
      animation: 'rise',
      eyebrow: t('Minimal at heart', 'مینیمال از ته دل')(l),
      title: t('Less, but louder', 'کمتر، اما بلندتر')(l),
      text: t(
        'I am a huge fan of minimal art and 2D design, yet colorful illustration is what pulls me in. I spend part of every day looking for new art and new ideas, so the work never stands still.',
        'عاشق هنر مینیمال و طراحی دوبعدی‌ام، اما تصویرسازی رنگی چیزی است که مرا به خودش می‌کشد. هر روز بخشی از وقتم را صرف پیدا کردن هنر و ایده‌های تازه می‌کنم تا کارم هیچ‌وقت درجا نزند.',
      )(l),
      buttonLabel: t('Say hello', 'سلام کنید')(l),
      buttonLink: '#contact',
      badgeText: t('GRAPHIC DESIGNER · BORN 1992 · TABRIZ · IRAN · ', 'طراح گرافیک · متولد ۱۳۷۱ · تبریز · ایران · ')(l),
      image: pic('about', 'Bio.jpg'),
      icon: '✦',
      badgeSide: 'end',
    },
  },
  {
    id: 'timeline',
    type: 'timeline',
    props: {
      title: t('The road so far', 'مسیری که تا امروز آمده‌ام')(l),
      items: [
        {
          date: '1992',
          title: t('Born in Iran', 'تولد در ایران')(l),
          text: t('A childhood of game consoles, cartoons and pencils.', 'کودکی با کنسول بازی، کارتون و مداد.')(l),
        },
        {
          date: t('Tabriz', 'تبریز')(l),
          title: t('Industrial design', 'طراحی صنعتی')(l),
          text: t(
            'A bachelor’s degree at Tabriz Islamic Art University: form, proportion and how things are made.',
            'کارشناسی در دانشگاه هنر اسلامی تبریز: فرم، تناسب و اینکه اشیا چطور ساخته می‌شوند.',
          )(l),
        },
        {
          date: '2017',
          title: t('The first brands', 'اولین برندها')(l),
          text: t(
            'Black Army, Liana Laser and Zhakar Handmade: the first full identities, from logo to mug.',
            'بلک آرمی، لیزر لیانا و ژاکار هندمید: اولین هویت‌های کامل، از لوگو تا ماگ.',
          )(l),
        },
        {
          date: t(`${brands.length} marks`, `${brands.length.toLocaleString('fa-IR')} نشان`)(l),
          title: t('A logo collection', 'مجموعه‌ای از لوگوها')(l),
          text: t(
            'Persian calligraphy, square Kufic, pixels, a willow and a palm — each drawn in color and in one grey.',
            'خوشنویسی فارسی، کوفی بنایی، پیکسل، یک بید و یک نخل؛ هر کدام رنگی و تک‌رنگ.',
          )(l),
        },
        {
          date: t('Triangles', 'مثلث‌ها')(l),
          title: t('Low poly portraits', 'پرتره‌های لوپلی')(l),
          text: t(
            'Shajarian, Shamlou, Entezami, Gilmour — and his mother, his friends and himself, built from flat triangles.',
            'شجریان، شاملو، انتظامی، گیلمور؛ و مادرش، دوستانش و خودش، ساخته از مثلث‌های تخت.',
          )(l),
        },
        {
          date: '2021',
          title: t('Into the blockchain', 'ورود به بلاکچین')(l),
          text: t(
            'Low poly animals and imaginary planets minted as NFTs on Hic et Nunc, Kalamint and OpenSea.',
            'حیوان‌های لوپلی و سیاره‌های خیالی که روی هیک ات نانک، کالامینت و اوپن‌سی به ان‌اف‌تی تبدیل شدند.',
          )(l),
        },
        {
          date: t('Today', 'امروز')(l),
          title: t('Kasra Design Studio', 'استودیو طراحی کسری')(l),
          text: t(
            'Taking on brands, books, games and people who want to be seen.',
            'پذیرای برندها، کتاب‌ها، بازی‌ها و آدم‌هایی که می‌خواهند دیده شوند.',
          )(l),
        },
      ],
    },
  },
  {
    id: 'words',
    type: 'text-scramble',
    props: {
      eyebrow: t('Five words I keep coming back to', 'پنج کلمه که همیشه به آن‌ها برمی‌گردم')(l),
      lines: t(
        'Minimal.\nColorful.\nLow poly.\nPixel-perfect.\nPersian at heart.',
        'مینیمال.\nرنگی.\nلوپلی.\nدقیق تا پیکسل.\nایرانی از ته دل.',
      )(l),
      text: '',
      seconds: 3,
      look: 'dark',
    },
  },
  {
    id: 'works',
    type: 'stacking-cards',
    props: {
      anchor: 'works',
      title: t('Seven chapters of work', 'هفت فصل از کارها')(l),
      cards: KINDS.map((k) => ({
        image: pic(k.key, k.cover),
        eyebrow: t(`${k.short('en')} · ${count(k.key)} pieces`, `${k.short('fa')} · ${count(k.key).toLocaleString('fa-IR')} اثر`)(l),
        title: k.name(l),
        text: k.text(l),
        color: k.color,
        buttonLabel: t('Open the collection', 'دیدن مجموعه')(l),
        buttonLink: href(k),
      })),
    },
  },
  {
    id: 'zhakar',
    type: 'zoom-reveal',
    props: {
      intro: t('Chapter two · One triangle', 'فصل دوم · یک مثلث')(l),
      eyebrow: t('Zhakar Handmade', 'ژاکار هندمید')(l),
      title: t('One pink triangle, a whole identity', 'یک مثلث صورتی، یک هویت کامل')(l),
      text: t(
        'For Zhakar, a maker of handmade goods, a single pink triangle became the play button, the corner of every card, the sign on the toilet door and the stripe on the mug.',
        'برای ژاکار، تولیدکننده‌ی محصولات دست‌ساز، یک مثلث صورتی شد دکمه‌ی پخش، گوشه‌ی هر کارت، تابلوی سرویس بهداشتی و نوار روی ماگ.',
      )(l),
      buttonLabel: t('See the identities', 'دیدن هویت‌های بصری')(l),
      buttonLink: href(kind.identity),
      image: pic('identity', 'Asset 19@300x-100.jpg'),
    },
  },
  {
    id: 'logos',
    type: 'hover-list',
    props: {
      title: t('Thirteen logos, thirteen stories', 'سیزده لوگو، سیزده داستان')(l),
      items: brands.map((b) => ({
        image: pic('logos', `${b}-01.jpg`),
        title: BRAND[b](l),
        meta: BRAND_KIND[b](l),
        link: href(kind.logos),
      })),
    },
  },
  {
    id: 'strip',
    type: 'logo-strip',
    props: {
      title: t('Brands drawn by Kasra', 'برندهایی که کسری کشیده')(l),
      logos: [
        ...files.logos
          .filter((f) => /-0?2\.jpg$/.test(f))
          .map((f) => ({ image: pic('logos', f), name: caption('logos', f, l), link: href(kind.logos) })),
        ...['my logo new-03.jpg', 'logo-nav.jpg'].map((f) => ({
          image: pic('about', f),
          name: t('Kasra Haghdoust', 'کسری حق‌دوست')(l),
          link: '#about',
        })),
      ],
      seconds: 30,
      twoRows: false,
      look: 'light',
    },
  },
  {
    id: 'poly',
    type: 'picture-text',
    props: {
      eyebrow: t('Chapter three · Triangles', 'فصل سوم · مثلث‌ها')(l),
      word: t('POLY', 'چهره')(l),
      image: pic('lowpoly', 'david gilmour-02.jpg'),
      text: t(
        'Then came the faces. Hundreds of flat triangles, each with one color, add up to a smile, a frown, a lifetime.',
        'بعد نوبت چهره‌ها رسید. صدها مثلث تخت، هر کدام با یک رنگ، کنار هم یک لبخند می‌سازند، یک اخم، یک عمر.',
      )(l),
      look: 'dark',
    },
  },
  {
    id: 'before-after',
    type: 'before-after',
    props: {
      animation: 'blur',
      title: t('Drag to fill in Shajarian', 'بکشید تا شجریان رنگ بگیرد')(l),
      before: shajarian.lines,
      after: shajarian.done,
      beforeLabel: t('The net of lines', 'تور خطوط')(l),
      afterLabel: t('Every triangle filled', 'همه‌ی مثلث‌ها پر شده')(l),
    },
  },
  {
    id: 'process',
    type: 'sticky-story',
    props: {
      title: t('How a portrait is made', 'یک پرتره چطور ساخته می‌شود')(l),
      imageSide: 'end',
      steps: [
        {
          image: pic('process', 'IMG_5116.JPG'),
          eyebrow: t('Step 1', 'قدم ۱')(l),
          title: t('Choose the photo', 'انتخاب عکس')(l),
          text: t(
            'A face with strong light and shadow gives the triangles something to say.',
            'چهره‌ای با نور و سایه‌ی قوی به مثلث‌ها حرفی برای گفتن می‌دهد.',
          )(l),
        },
        {
          image: pic('process', 'IMG_5117.JPG'),
          eyebrow: t('Step 2', 'قدم ۲')(l),
          title: t('Draw the net', 'کشیدن تور')(l),
          text: t(
            'Small triangles where the face changes fast — eyes, lips — and big ones on the shoulders.',
            'مثلث‌های کوچک جایی که چهره سریع عوض می‌شود — چشم و لب — و مثلث‌های بزرگ روی شانه‌ها.',
          )(l),
        },
        {
          image: pic('process', 'IMG_5118.JPG'),
          eyebrow: t('Step 3', 'قدم ۳')(l),
          title: t('Fill, one by one', 'پر کردن، یکی‌یکی')(l),
          text: t(
            'Each triangle takes a single color picked from the photo underneath.',
            'هر مثلث یک رنگ تنها می‌گیرد که از عکس زیرش برداشته شده.',
          )(l),
        },
        {
          image: pic('process', 'IMG_5119.JPG'),
          eyebrow: t('Step 4', 'قدم ۴')(l),
          title: t('Let it breathe', 'جا دادن به نفس')(l),
          text: t(
            'A background color, a frame, a quote — and the portrait is ready to print.',
            'یک رنگ زمینه، یک قاب، یک جمله؛ و پرتره آماده‌ی چاپ است.',
          )(l),
        },
      ],
    },
  },
  {
    id: 'faces',
    type: 'photo-columns',
    props: {
      eyebrow: t('Low poly portraits', 'پرتره‌های لوپلی')(l),
      title: t('Faces that shaped me', 'چهره‌هایی که مرا ساختند')(l),
      text: t(
        'Singers, poets and actors I grew up with, next to the people I love most.',
        'خواننده‌ها، شاعرها و بازیگرانی که با آن‌ها بزرگ شدم، کنار آدم‌هایی که بیش از همه دوستشان دارم.',
      )(l),
      buttonLabel: t('All portraits', 'همه‌ی پرتره‌ها')(l),
      buttonLink: href(kind.lowpoly),
      photos: files.lowpoly.map((f) => photo('lowpoly', f, l)),
      seconds: 40,
      look: 'dark',
    },
  },
  {
    id: 'play',
    type: 'image-trail',
    props: {
      eyebrow: t('Chapter four · Play', 'فصل چهارم · بازی')(l),
      title: t('Simple thoughts', 'فکرهای ساده')(l),
      text: t(
        'Controllers, skateboards and cartoon heroes, drawn flat and bright.',
        'دسته‌ی بازی، اسکیت‌بورد و قهرمان‌های کارتونی، تخت و روشن.',
      )(l),
      hint: t('Move your mouse over the title', 'ماوس را روی عنوان حرکت دهید')(l),
      photos: [
        'ps5-01.jpg',
        'buzz-01.jpg',
        'Mushroom-01.jpg',
        'woody-01.jpg',
        'Untitled-1-01 (3).jpg',
        'faces1.jpg',
        'sonic-01.jpg',
        'Untitled-2-01.jpg',
        'IMG_2192-01.jpg',
        'Untitled-1-01.jpg',
        'faces2.jpg',
        'ps5-02.jpg',
      ].map((f) => photo('illustration', f, l)),
    },
  },
  {
    id: 'fan',
    type: 'card-fan',
    props: {
      eyebrow: t('Illustration', 'تصویرسازی')(l),
      title: t('A deck of childhood heroes', 'یک دست ورق از قهرمان‌های کودکی')(l),
      text: t('Scroll and the pile spreads out.', 'اسکرول کنید تا ورق‌ها باز شوند.')(l),
      cards: [
        'Untitled-1-01 (2).jpg',
        'Untitled-11-01.jpg',
        'black-01-01.jpg',
        'faces3.jpg',
        'Untitled-2.jpg',
        'Untitled.jpg',
        'Untitled 2.jpg',
      ].map((f) => ({ image: pic('illustration', f), title: caption('illustration', f, l), text: '' })),
    },
  },
  {
    id: 'nft',
    type: 'expanding-panels',
    props: {
      anchor: 'nft',
      title: t('Chapter five · The future', 'فصل پنجم · آینده')(l),
      panels: [
        [
          'Opensea Series 1.jpg',
          t('A herd on black glass', 'گله‌ای روی شیشه‌ی سیاه'),
          t('Crystal animals and their reflections, on OpenSea.', 'جانورهای بلورین و انعکاسشان، در اوپن‌سی.'),
        ],
        [
          'HEN Animal Series 1.jpg',
          t('Hic et Nunc animals', 'حیوان‌های هیک ات نانک'),
          t('Twelve low poly heads, each with its token number.', 'دوازده سر لوپلی، هر کدام با شماره‌ی توکنش.'),
        ],
        [
          'Kalamin Planets Series 1.jpg',
          t('Kalamint planets', 'سیاره‌های کالامینت'),
          t('Worlds that exist only in pixels.', 'دنیاهایی که فقط در پیکسل‌ها وجود دارند.'),
        ],
        ['Low Poly Lion.jpg', t('The lion', 'شیر'), t('Gold and amber, in a hundred facets.', 'طلایی و کهربایی، در صد وجه.')],
        ['Planet ZH-1966.jpg', t('Planet ZH-1966', 'سیاره‌ی ZH-1966'), t('Marble swirls of pink and black.', 'چرخش مرمری صورتی و سیاه.')],
        ['Unicorn.jpg', t('The unicorn', 'تک‌شاخ'), t('Standing between two pillars of light.', 'ایستاده میان دو ستون نور.')],
        ['Bear.jpg', t('The bear', 'خرس'), t('Bear market, as a sculpture.', 'بازار نزولی، در قالب یک مجسمه.')],
      ].map(([f, title, text]) => ({ image: pic('nft', f), title: title(l), text: text(l), link: href(kind.nft) })),
    },
  },
  {
    id: 'planets',
    type: 'orbit',
    props: {
      eyebrow: t('NFT', 'ان‌اف‌تی')(l),
      title: t('A small solar system', 'یک منظومه‌ی کوچک')(l),
      text: t('Eight imaginary planets, each with a code name and a year.', 'هشت سیاره‌ی خیالی، هر کدام با یک رمز و یک سال.')(l),
      buttonLabel: t('See every NFT', 'دیدن همه‌ی ان‌اف‌تی‌ها')(l),
      buttonLink: href(kind.nft),
      items: files.nft.filter((f) => f.startsWith('Planet')).map((f) => ({ image: pic('nft', f), icon: '', name: caption('nft', f, l) })),
      seconds: 40,
    },
  },
  {
    id: 'numbers',
    type: 'counters',
    props: {
      animation: 'rise',
      title: t('The portfolio in numbers', 'نمونه‌کارها به زبان عدد')(l),
      items: [
        { value: total, prefix: '', suffix: '', label: t('Pieces in this portfolio', 'اثر در این مجموعه')(l) },
        { value: brands.length, prefix: '', suffix: '', label: t('Logos', 'لوگو')(l) },
        { value: count('lowpoly'), prefix: '', suffix: '', label: t('Low poly portraits', 'پرتره‌ی لوپلی')(l) },
        { value: count('nft'), prefix: '', suffix: '', label: t('NFT pieces', 'اثر ان‌اف‌تی')(l) },
      ],
    },
  },
  {
    id: 'share',
    type: 'progress-bars',
    props: {
      title: t('What this portfolio is made of', 'این مجموعه از چه ساخته شده')(l),
      text: t('Each kind of work as a share of this portfolio.', 'سهم هر نوع کار از این مجموعه.')(l),
      items: KINDS.map((k) => ({ label: k.name(l), value: Math.round((count(k.key) / total) * 100) })),
    },
  },
  {
    id: 'pop',
    type: 'floating-gallery',
    props: {
      eyebrow: t('Chapter six · Print', 'فصل ششم · چاپ')(l),
      title: t('Louder than life', 'بلندتر از واقعیت')(l),
      text: t(
        'Pop art, gold foil and coffee cups: the work leaves the screen.',
        'پاپ‌آرت، طلاکوب و لیوان قهوه: کار از صفحه بیرون می‌آید.',
      )(l),
      buttonLabel: t('See the pop art', 'دیدن پاپ‌آرت')(l),
      buttonLink: href(kind.popart),
      photos: [
        photo('popart', 'pop art-04.jpg', l),
        photo('identity', 'Golden_Logo_on_Black_Textured_Paper_Mockup (2).jpg', l),
        photo('identity', 'cup-28.jpg', l),
        photo('popart', 'pop art-03.jpg', l),
        photo('identity', 'Products_Mockup_2s.jpg', l),
        photo('lowpoly', 'Present 2.jpg', l),
        photo('identity', 'card.jpg', l),
        photo('lowpoly', 'Present 1.jpg', l),
      ],
    },
  },
  {
    id: 'motto',
    type: 'scroll-marquee',
    props: {
      rows: [
        {
          text: t('Logo · Identity · Illustration · Low poly · NFT', 'لوگو · هویت بصری · تصویرسازی · لوپلی · ان‌اف‌تی')(l),
          style: 'solid',
        },
        { text: t('Kasra Haghdoust', 'کسری حق‌دوست')(l), style: 'outline' },
        { text: t('Less, but louder', 'کمتر، اما بلندتر')(l), style: 'accent' },
      ],
      speed: 'medium',
      look: 'dark',
    },
  },
  {
    id: 'hire',
    type: 'contact-split',
    props: {
      image: pic('lowpoly', 'me-02.jpg'),
      title: t('Hire me', 'با من کار کنید')(l),
      text: t(
        'Like my work? Write to me about your brand, your book cover or your portrait. I’ll be happy to work with you.',
        'کارهایم را دوست دارید؟ درباره‌ی برندتان، جلد کتابتان یا پرتره‌تان برایم بنویسید. خوشحال می‌شوم با شما کار کنم.',
      )(l),
      address: t('Iran', 'ایران')(l),
      email: EMAIL,
      phone: t('+98 937 395 8660', '۰۹۳۷۳۹۵۸۶۶۰')(l),
      fields: [
        { label: t('Name', 'نام')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Email', 'ایمیل')(l), type: 'email', required: true, options: '', placeholder: '' },
        {
          label: t('What do you need?', 'به چه چیزی نیاز دارید؟')(l),
          type: 'select',
          required: false,
          options: KINDS.filter((k) => k.key !== 'process')
            .map((k) => k.name(l))
            .join(', '),
          placeholder: '',
        },
        { label: t('Message', 'پیام')(l), type: 'textarea', required: true, options: '', placeholder: '' },
      ],
      submitLabel: t('Send', 'ارسال')(l),
      successMessage: t('Thank you! Kasra will write back soon.', 'ممنون! کسری به‌زودی جواب می‌دهد.')(l),
    },
  },
  contactFooter(l),
];

// ---------- One page per kind of work ----------
const intro = (k, l) => ({
  id: 'intro',
  type: 'scroll-text',
  props: { eyebrow: k.short(l), text: k.text(l) },
});

const workPages = {
  identity: (l) => [
    {
      id: 'hero',
      type: 'zoom-reveal',
      props: {
        intro: t('Corporate identity', 'هویت بصری')(l),
        eyebrow: t(`${count('identity')} pieces`, `${count('identity').toLocaleString('fa-IR')} اثر`)(l),
        title: t('Brands that look like themselves everywhere', 'برندهایی که همه‌جا شبیه خودشان‌اند')(l),
        text: kind.identity.text(l),
        buttonLabel: t('See everything', 'دیدن همه')(l),
        buttonLink: '#all',
        image: pic('identity', 'Natural Paper Printed Logo MockUp.jpg'),
      },
    },
    intro(kind.identity, l),
    {
      id: 'brands',
      type: 'horizontal-scroll',
      props: {
        title: t('Eleven brands', 'یازده برند')(l),
        text: t('Scroll down and they slide past.', 'اسکرول کنید تا از جلوی شما رد شوند.')(l),
        cards: [
          ['photo_2017-11-11_21-49-14.jpg', BRAND.zhakar, t('A pink triangle on black and white.', 'یک مثلث صورتی روی سیاه و سفید.')],
          [
            'Business Cards With Wooden Board-Recovered.jpg',
            t('Plus Store', 'پلاس استور'),
            t('A red cross that reads as a plus.', 'صلیبی قرمز که «به‌علاوه» خوانده می‌شود.'),
          ],
          ['13_April_02.jpg', BRAND['arx 2'], t('A folder as sharp as the logo.', 'فولدری به تیزی لوگو.')],
          ['ARX MOCKUP.jpg', BRAND.arx, t('An arc of lime above the letters.', 'کمانی لیمویی بالای حروف.')],
          [
            'business card mockup.jpg',
            t('ARX Design & Construction', 'آرکس طراحی و ساخت'),
            t('The same arc, for the builders.', 'همان کمان، این بار برای سازنده‌ها.'),
          ],
          ['b b mockup.jpg', BRAND.bb, t('A leaf, a ring and a script.', 'یک برگ، یک حلقه و یک دست‌خط.')],
          ['Products_Mockup_2s.jpg', BRAND.ws, t('Coffee in pixel art.', 'قهوه به زبان پیکسل.')],
          [
            'IMG_20171113_145311_570.jpg',
            t('Black Army', 'بلک آرمی'),
            t('A gas mask that is also a game pad.', 'ماسک ضدگازی که دسته‌ی بازی هم هست.'),
          ],
          [
            'IMG_20171209_142951_396.jpg',
            t('Liana Laser', 'لیزر لیانا'),
            t('A profile made of light beams.', 'نیم‌رخی ساخته از پرتوهای نور.'),
          ],
          ['card.jpg', BRAND.cgp, t('A golden brush stroke on charcoal.', 'یک ضربه‌قلم طلایی روی زغالی.')],
          ['76478.jpg', t('Kasra Haghdoust', 'کسری حق‌دوست'), t('His own mark: two links of a chain.', 'نشان خودش: دو حلقه‌ی یک زنجیر.')],
        ].map(([f, title, text]) => ({
          image: pic('identity', f),
          tag: t('Identity', 'هویت بصری')(l),
          title: title(l),
          text: text(l),
          link: '#all',
        })),
      },
    },
    {
      id: 'zhakar',
      type: 'sticky-story',
      props: {
        title: t('Zhakar Handmade, piece by piece', 'ژاکار هندمید، تکه به تکه')(l),
        imageSide: 'start',
        steps: [
          [
            'Asset 18_1@300x-100.jpg',
            t('The mark', 'نشان'),
            t('Persian letters with a pink triangle tucked into the last one.', 'حروف فارسی با یک مثلث صورتی که در آخرین حرف جا خوش کرده.'),
          ],
          [
            'Asset 8@300x-100.jpg',
            t('The cards', 'کارت‌ها'),
            t('Black and white, front and back, with the triangle in the corner.', 'سیاه و سفید، رو و پشت، با مثلث در گوشه.'),
          ],
          [
            'Asset 11@300x-100.jpg',
            t('The pictograms', 'پیکتوگرام‌ها'),
            t('Every sign in the shop lives inside the same triangle.', 'همه‌ی تابلوهای فروشگاه درون همان مثلث زندگی می‌کنند.'),
          ],
          ['Asset 12@300x-100.jpg', t('On the wall', 'روی دیوار'), t('The pictograms, cut and mounted.', 'پیکتوگرام‌ها، بریده و نصب‌شده.')],
          [
            'Asset 17@300x-100.jpg',
            t('The bag', 'ساک خرید'),
            t('What the customer carries home.', 'چیزی که مشتری با خودش به خانه می‌برد.'),
          ],
          ['Asset 18@300x-100.jpg', t('The mug', 'ماگ'), t('A pink inside, for the coffee break.', 'داخلی صورتی، برای وقت قهوه.')],
        ].map(([f, title, text]) => ({ image: pic('identity', f), eyebrow: BRAND.zhakar(l), title: title(l), text: text(l) })),
      },
    },
    fullGallery('identity', l, t('Every identity piece', 'همه‌ی آثار هویت بصری')(l)),
    moreWork('identity', l),
    contactFooter(l),
  ],

  logos: (l) => [
    {
      id: 'hero',
      type: 'orbit',
      props: {
        eyebrow: t(`${brands.length} logos`, `${brands.length.toLocaleString('fa-IR')} لوگو`)(l),
        title: t('Logos', 'لوگوها')(l),
        text: kind.logos.text(l),
        buttonLabel: t('See them all', 'دیدن همه')(l),
        buttonLink: '#all',
        items: [
          ...brands.map((b) => ({ image: pic('logos', `${b}-01.jpg`), icon: '', name: BRAND[b](l) })),
          { image: pic('about', 'my logo new-01.jpg'), icon: '', name: t('Kasra Haghdoust', 'کسری حق‌دوست')(l) },
        ],
        seconds: 45,
      },
    },
    intro(kind.logos, l),
    {
      id: 'flip',
      type: 'flip-cards',
      props: {
        title: t('Turn them over', 'برشان گردانید')(l),
        items: ['aqaj', 'lafik', 'ws', 'dd', 'hg', 'bb', 'cgp', 'mot1'].map((b) => ({
          image: pic('logos', `${b}-01.jpg`),
          title: BRAND[b](l),
          back: BRAND_KIND[b](l),
          buttonLabel: '',
          buttonLink: '',
        })),
      },
    },
    {
      id: 'mono',
      type: 'before-after',
      props: {
        title: t('Does it work in one color?', 'با یک رنگ هم کار می‌کند؟')(l),
        before: pic('logos', 'zhakar-02.jpg'),
        after: pic('logos', 'zhakar-01.jpg'),
        beforeLabel: t('One grey', 'یک خاکستری')(l),
        afterLabel: t('Full color', 'تمام‌رنگی')(l),
      },
    },
    fullGallery('logos', l, t('Every logo, in color and in grey', 'همه‌ی لوگوها، رنگی و خاکستری')(l)),
    moreWork('logos', l),
    contactFooter(l),
  ],

  lowpoly: (l) => [
    {
      id: 'hero',
      type: 'picture-text',
      props: {
        eyebrow: kind.lowpoly.name(l),
        word: t('FACES', 'چهره‌ها')(l),
        image: pic('lowpoly', 'Shajarian.jpg'),
        text: kind.lowpoly.text(l),
        look: 'dark',
      },
    },
    {
      id: 'columns',
      type: 'photo-columns',
      props: {
        eyebrow: t(`${count('lowpoly')} portraits`, `${count('lowpoly').toLocaleString('fa-IR')} پرتره`)(l),
        title: t('Hundreds of triangles each', 'هر کدام صدها مثلث')(l),
        text: t(
          'Legends of Persian music, poetry and film, a rock guitarist, and family.',
          'اسطوره‌های موسیقی، شعر و سینمای ایران، یک گیتاریست راک، و خانواده.',
        )(l),
        buttonLabel: t('How they are made', 'چطور ساخته می‌شوند')(l),
        buttonLink: href(kind.process),
        photos: files.lowpoly.map((f) => photo('lowpoly', f, l)),
        seconds: 45,
        look: 'dark',
      },
    },
    {
      id: 'legends',
      type: 'tilt-cards',
      props: {
        title: t('Legends', 'اسطوره‌ها')(l),
        items: [
          ['Shajarian.jpg', t('The voice of Persian music.', 'صدای موسیقی ایران.')],
          ['shamloo-02.jpg', t('The poet of freedom.', 'شاعر آزادی.')],
          ['entezami-01.jpg', t('A giant of Iranian cinema.', 'غول سینمای ایران.')],
          ['khosro-04.jpg', t('The actor everyone still quotes.', 'بازیگری که همه هنوز دیالوگ‌هایش را تکرار می‌کنند.')],
          [
            'david gilmour-02.jpg',
            t('“The trick to having a happy life is being good at something.”', '«راز یک زندگی شاد این است که در کاری خوب باشی.»'),
          ],
          ['mom-01.jpg', t('The first face he ever drew.', 'اولین چهره‌ای که کشید.')],
        ].map(([f, text]) => ({ image: pic('lowpoly', f), icon: '', title: caption('lowpoly', f, l), text: text(l), link: '' })),
      },
    },
    fullGallery('lowpoly', l, t('Every portrait', 'همه‌ی پرتره‌ها')(l)),
    moreWork('lowpoly', l),
    contactFooter(l),
  ],

  process: (l) => [
    {
      id: 'hero',
      type: 'before-after',
      props: {
        title: t('From a net of lines to a face', 'از تور خطوط تا یک چهره')(l),
        before: najafi.lines,
        after: najafi.done,
        beforeLabel: t('Lines', 'خطوط')(l),
        afterLabel: t('Color', 'رنگ')(l),
      },
    },
    intro(kind.process, l),
    {
      id: 'steps',
      type: 'sticky-story',
      props: {
        title: t('Nine portraits, four stages each', 'نُه پرتره، هر کدام در چهار مرحله')(l),
        imageSide: 'end',
        steps: files.process.map((f, i) => ({
          image: pic('process', f),
          eyebrow: t(
            `Portrait ${i + 1} of ${count('process')}`,
            `پرتره‌ی ${(i + 1).toLocaleString('fa-IR')} از ${count('process').toLocaleString('fa-IR')}`,
          )(l),
          title: caption('process', f, l),
          text: [
            t(
              'Top left: only the lines. Top right: the first colors. Bottom: almost there, and finished.',
              'بالا چپ: فقط خطوط. بالا راست: اولین رنگ‌ها. پایین: تقریباً تمام، و تمام.',
            ),
            t(
              'The hair is always the hardest part: many small triangles, many dark colors.',
              'مو همیشه سخت‌ترین بخش است: مثلث‌های کوچک فراوان و رنگ‌های تیره‌ی فراوان.',
            ),
            t('Fabric folds become a few large triangles.', 'چین‌های پارچه به چند مثلث بزرگ تبدیل می‌شوند.'),
          ][i % 3](l),
        })),
      },
    },
    fullGallery('process', l, t('Every process sheet', 'همه‌ی برگه‌های مراحل')(l)),
    moreWork('process', l),
    contactFooter(l),
  ],

  nft: (l) => [
    {
      id: 'hero',
      type: 'text-scramble',
      props: {
        eyebrow: t('NFT', 'ان‌اف‌تی')(l),
        lines: 'Hic et Nunc\nKalamint\nOpenSea',
        text: kind.nft.text(l),
        buttonLabel: t('See all of them', 'دیدن همه')(l),
        buttonLink: '#all',
        seconds: 3,
        look: 'dark',
      },
    },
    {
      id: 'series',
      type: 'expanding-panels',
      props: {
        title: t('The series', 'سری‌ها')(l),
        panels: [
          'HEN Animal Series 2.jpg',
          'HEN Animal Series 3.jpg',
          'Kalamint Planet Series 2.jpg',
          'Opensea Series 2.jpg',
          'Mammoth.jpg',
          'Owl.jpg',
          'Bull.jpg',
        ].map((f) => ({ image: pic('nft', f), title: caption('nft', f, l), text: '', link: '#all' })),
      },
    },
    {
      id: 'animals',
      type: 'tilt-cards',
      props: {
        title: t('Low poly animals', 'حیوان‌های لوپلی')(l),
        items: [
          'Low Poly Fox.jpg',
          'Low Poly Tiger.jpg',
          'Low Poly Panda.jpg',
          'Low Poly Owl.jpg',
          'Low Poly Eagle.jpg',
          'Low Poly Koala.jpg',
          'Low Poly Elephant.jpg',
          'Low Poly wolf.jpg',
        ].map((f) => ({ image: pic('nft', f), icon: '', title: caption('nft', f, l), text: '', link: '' })),
      },
    },
    {
      id: 'planets',
      type: 'floating-gallery',
      props: {
        eyebrow: t('Kalamint', 'کالامینت')(l),
        title: t('Imaginary planets', 'سیاره‌های خیالی')(l),
        text: t('Each one named with two letters and a year.', 'هر کدام با دو حرف و یک سال نام‌گذاری شده.')(l),
        buttonLabel: '',
        buttonLink: '',
        photos: files.nft.filter((f) => f.startsWith('Planet')).map((f) => photo('nft', f, l)),
      },
    },
    fullGallery('nft', l, t('Every NFT', 'همه‌ی ان‌اف‌تی‌ها')(l)),
    moreWork('nft', l),
    contactFooter(l),
  ],

  illustration: (l) => [
    {
      id: 'hero',
      type: 'image-trail',
      props: {
        eyebrow: t(`${count('illustration')} illustrations`, `${count('illustration').toLocaleString('fa-IR')} تصویرسازی`)(l),
        title: t('Illustration', 'تصویرسازی')(l),
        text: kind.illustration.text(l),
        hint: t('Move your mouse over the title', 'ماوس را روی عنوان حرکت دهید')(l),
        photos: files.illustration.slice(0, 12).map((f) => photo('illustration', f, l)),
      },
    },
    intro(kind.illustration, l),
    {
      id: 'fan',
      type: 'card-fan',
      props: {
        eyebrow: t('Game on', 'شروع بازی')(l),
        title: t('Controllers through the years', 'دسته‌های بازی در گذر سال‌ها')(l),
        text: '',
        cards: [
          'Untitled-1-02.jpg',
          'Untitled-1-01 (2).jpg',
          'Untitled-2-01.jpg',
          'black-01-01.jpg',
          'Untitled-2.jpg',
          'ps5-01.jpg',
          'ps5-02.jpg',
        ].map((f) => ({
          image: pic('illustration', f),
          title: caption('illustration', f, l),
          text: '',
        })),
      },
    },
    fullGallery('illustration', l, t('Every illustration', 'همه‌ی تصویرسازی‌ها')(l)),
    moreWork('illustration', l),
    contactFooter(l),
  ],

  popart: (l) => [
    {
      id: 'hero',
      type: 'picture-text',
      props: {
        eyebrow: kind.popart.name(l),
        word: t('POP', 'پاپ')(l),
        image: pic('popart', 'pop art-04.jpg'),
        text: kind.popart.text(l),
        look: 'light',
      },
    },
    {
      id: 'versions',
      type: 'before-after',
      props: {
        title: t('First cut and final', 'نسخه‌ی اول و نهایی')(l),
        before: pic('popart', 'pop art-03.jpg'),
        after: pic('popart', 'pop art-04.jpg'),
        beforeLabel: t('First cut', 'نسخه‌ی اول')(l),
        afterLabel: t('Final', 'نهایی')(l),
      },
    },
    fullGallery('popart', l, t('Pop art', 'پاپ‌آرت')(l)),
    moreWork('popart', l),
    contactFooter(l),
  ],
};

// ---------- Every picture is used ----------
// Building the blocks marks the pictures they show as used.
for (const l of ['en', 'fa']) {
  story(l);
  for (const build of Object.values(workPages)) build(l);
}
const unused = Object.entries(files).flatMap(([key, list]) => list.filter((f) => !used.has(pics[key][f])).map((f) => `${key}/${f}`));
if (unused.length) throw new Error(`These pictures are not used anywhere: ${unused.join(', ')}`);

// ---------- Save ----------
const theme = {
  primary: '#f5c400',
  secondary: '#58595b',
  dark: '#141416',
  background: '#141416',
  headerStyle: 'glass',
  cursor: 'ring',
  pageTransition: 'curtain',
};
const LOCALES = ['en', 'fa'];
const seo = (title, description) => Object.fromEntries(LOCALES.map((l) => [l, { seoTitle: title(l), seoDescription: description(l) }]));

if (DRY) {
  const pages = [['story', story], ...Object.entries(workPages)];
  for (const [name, build] of pages) console.log(`${name}: ${build('en').length} blocks`);
  console.log(`${total + count('about')} pictures, all used`);
  process.exit(0);
}

async function savePage({ name, slug, home, title, description, blocks, pageTheme }) {
  const pages = await api('GET', '/admin/pages');
  let page = home ? pages.find((p) => p.isHome) : pages.find((p) => p.name === name);
  page ??= await api('POST', '/admin/pages', { name });
  const slugs = Object.fromEntries(LOCALES.map((l) => [l, home ? (page.translations.find((x) => x.locale === l)?.slug ?? '') : slug]));
  const meta = seo(title, description);
  await api('PATCH', `/admin/pages/${page.id}`, {
    name: page.name,
    theme: pageTheme ?? null,
    translations: LOCALES.map((l) => ({ locale: l, slug: slugs[l], title: title(l), ...meta[l], blocks: blocks(l) })),
  });
  await api('POST', `/admin/pages/${page.id}/publish`);
  console.log(`Published: ${LOCALES.map((l) => `/${l}/${slugs[l]}`).join('  ')}`);
}

// On their own pages the colors belong to the pages; with --home they are the site's.
const pageTheme = HOME ? null : theme;

for (const k of KINDS) {
  await savePage({
    name: `Kasra · ${k.name('en')}`,
    slug: k.slug,
    title: (l) => t(`${k.name('en')} — Kasra Haghdoust`, `${k.name('fa')} — کسری حق‌دوست`)(l),
    description: k.text,
    blocks: workPages[k.key],
    pageTheme,
  });
}

await savePage({
  name: 'Kasra · Story',
  slug: 'kasra',
  home: HOME,
  title: t('Kasra Haghdoust — Graphic designer', 'کسری حق‌دوست — طراح گرافیک'),
  description: t(
    'Kasra Haghdoust is a graphic designer from Iran: logos, corporate identities, low poly portraits, illustrations and NFTs.',
    'کسری حق‌دوست، طراح گرافیک ایرانی: لوگو، هویت بصری، پرتره‌ی لوپلی، تصویرسازی و ان‌اف‌تی.',
  ),
  blocks: story,
  pageTheme,
});

if (HOME) {
  const settings = await api('GET', '/admin/settings');
  const logo = await transparentLogo('my logo new-03.jpg');
  const favicon = await transparentLogo('logo-nav.jpg');
  await api('PUT', '/admin/settings', {
    siteName: { fa: 'کسری حق‌دوست', en: 'Kasra Haghdoust' },
    logo,
    favicon,
    theme: { ...settings.theme, ...theme },
    menu: [
      { href: '#works', label: { fa: 'کارها', en: 'Works' } },
      { href: '#about', label: { fa: 'درباره‌ی من', en: 'About' } },
      { href: 'logos', label: { fa: 'لوگو', en: 'Logos' } },
      { href: 'low-poly', label: { fa: 'لوپلی', en: 'Low poly' } },
      { href: 'nft', label: { fa: 'ان‌اف‌تی', en: 'NFT' } },
      { href: '#contact', label: { fa: 'تماس', en: 'Contact' } },
    ],
    fonts: settings.fonts,
    savedThemes: settings.savedThemes,
    loader: settings.loader,
    maintenance: settings.maintenance,
    maintenanceText: settings.maintenanceText,
    business: { ...settings.business, phone: PHONE, email: EMAIL, country: 'IR' },
    notifyEmail: settings.notifyEmail || EMAIL,
  });
  console.log('Site name, logo, menu and colors set');
}
