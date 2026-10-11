/**
 * Builds the "Mazaheri Trading" customs-clearance site in Persian and English: a story-like guide to clearing goods
 * through Iranian customs, made mostly of animated blocks, with generated placeholder pictures.
 * It only talks to the admin API, so it works against a local site or a live one.
 *
 *   node scripts/seed-mazaheri.mjs           a separate page at /fa/ترخیص-کالا and /en/customs-clearance (safe)
 *   node scripts/seed-mazaheri.mjs --home    replaces the home page, and sets the site name, menu and colors
 *
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD.
 * Running it again updates the same page; the pictures are uploaded again each time.
 * On the server, see the "Mazaheri content" section of DEPLOY.md.
 */
import { createRequire } from 'node:module';

const API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const HOME = process.argv.includes('--home');

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
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(ADMIN),
});
if (!login.ok) throw new Error(`login failed (${login.status}): check API_URL, ADMIN_EMAIL and ADMIN_PASSWORD`);
const token = (await login.json()).token;

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function upload(bytes, name, type) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd });
  if (!res.ok) throw new Error(`upload ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

const esc = (s) => String(s).replace(/[<&>]/g, (c) => `&#${c.charCodeAt(0)};`);

/** A soft two-color background. */
function photo({ width = 1600, height = 1000, from, to }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="l" cx="0.3" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#l)"/>
    <circle cx="${width * 0.72}" cy="${height * 0.62}" r="${Math.min(width, height) * 0.22}" fill="#fff" fill-opacity="0.12"/></svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

/** A person-shaped cut-out on a transparent background (stands in for a portrait). */
function cutout({ width = 700, height = 1000, color }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <circle cx="${width / 2}" cy="${height * 0.3}" r="${width * 0.18}" fill="${color}"/>
    <path d="M ${width * 0.15} ${height} Q ${width * 0.15} ${height * 0.52} ${width / 2} ${height * 0.52} Q ${width * 0.85} ${height * 0.52} ${width * 0.85} ${height} Z" fill="${color}"/></svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
}

/** A vertical name on a transparent background. */
function nameTag(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="480">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="72" fill="#fff"
      transform="rotate(-90 80 240)">${esc(text)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ---------- Illustrations: a port at different hours, container stacks, documents ----------
const CONT = ['#c2410c', '#0e7490', '#b45309', '#1d4ed8', '#15803d', '#9f1239', '#f59e0b', '#475569'];
function port({ w = 1800, h = 1100, sky = ['#0b1324', '#1e3a5f'], sea = '#0c2a43', label = '', seed = 1, crane = true } = {}) {
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ground = h * 0.68;
  let boxes = '';
  for (let row = 0; row < 4; row++)
    for (let x = -20; x < w; x += 118) {
      if (rnd() < 0.18) continue;
      const stack = 1 + Math.floor(rnd() * (4 - row));
      for (let s = 0; s < stack; s++) {
        const y = ground + row * 34 - (s + 1) * 44 + row * 10;
        const c = CONT[Math.floor(rnd() * CONT.length)];
        boxes += `<rect x="${x + row * 30}" y="${y}" width="112" height="42" fill="${c}" stroke="#0006" stroke-width="2"/>`;
        for (let k = 1; k < 8; k++)
          boxes += `<line x1="${x + row * 30 + k * 14}" y1="${y + 4}" x2="${x + row * 30 + k * 14}" y2="${y + 38}" stroke="#0003" stroke-width="2"/>`;
      }
    }
  const cranes = crane
    ? [0.18, 0.52, 0.83]
        .map(
          (p) => `<g stroke="#f59e0b" stroke-width="10" fill="none" opacity=".9">
      <line x1="${w * p}" y1="${ground}" x2="${w * p}" y2="${h * 0.18}"/><line x1="${w * p + 60}" y1="${ground}" x2="${w * p + 60}" y2="${h * 0.18}"/>
      <line x1="${w * p - 160}" y1="${h * 0.2}" x2="${w * p + 260}" y2="${h * 0.2}"/><line x1="${w * p}" y1="${h * 0.3}" x2="${w * p + 60}" y2="${h * 0.22}"/>
      <line x1="${w * p + 200}" y1="${h * 0.2}" x2="${w * p + 200}" y2="${h * 0.4}" stroke-width="3"/></g>`,
        )
        .join('')
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="sun" cx=".75" cy=".35" r=".35"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#s)"/><rect width="100%" height="100%" fill="url(#sun)"/>
    <rect y="${ground}" width="100%" height="${h - ground}" fill="${sea}"/>
    ${cranes}${boxes}
    <rect y="${h * 0.9}" width="100%" height="${h * 0.1}" fill="#0008"/>
    ${label ? `<text x="50%" y="${h * 0.12}" font-family="Vazirmatn, sans-serif" font-size="${Math.round(h / 12)}" font-weight="900" fill="#fff" fill-opacity=".9" text-anchor="middle">${esc(label)}</text>` : ''}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}
function paper({ w = 1400, h = 1000, from = '#e2e8f0', to = '#94a3b8', stamp = '#0e7490', label = '', mark = '' } = {}) {
  const lines = Array.from(
    { length: 12 },
    (_, i) =>
      `<rect x="${w * 0.3}" y="${h * 0.24 + i * 44}" width="${w * (0.25 + ((i * 37) % 17) / 60)}" height="12" rx="6" fill="#33415555"/>`,
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="rotate(-6 ${w / 2} ${h / 2})"><rect x="${w * 0.24}" y="${h * 0.12}" width="${w * 0.52}" height="${h * 0.8}" rx="18" fill="#fff" stroke="#0002" stroke-width="3"/>${lines}
    <circle cx="${w * 0.66}" cy="${h * 0.72}" r="${h * 0.11}" fill="none" stroke="${stamp}" stroke-width="12" opacity=".85"/>
    <text x="${w * 0.66}" y="${h * 0.735}" font-family="sans-serif" font-size="${h * 0.05}" font-weight="900" fill="${stamp}" text-anchor="middle">${esc(mark)}</text></g>
    ${label ? `<text x="50%" y="${h * 0.08}" font-family="sans-serif" font-size="${Math.round(h / 14)}" font-weight="900" fill="#0f172a" fill-opacity=".85" text-anchor="middle">${esc(label)}</text>` : ''}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}
const up = async (buf, name) => upload(await buf, name, 'image/jpeg');
const img = {
  dawn: await up(port({ sky: ['#1e1b4b', '#f59e0b'], sea: '#1e293b', seed: 3 }), 'port-dawn.jpg'),
  night: await up(port({ sky: ['#020617', '#1e3a5f'], seed: 7 }), 'port-night.jpg'),
  day: await up(port({ sky: ['#0369a1', '#7dd3fc'], sea: '#075985', seed: 11 }), 'port-day.jpg'),
  dusk: await up(port({ sky: ['#4c0519', '#fb923c'], sea: '#3b0764', seed: 17 }), 'port-dusk.jpg'),
  airport: await up(port({ sky: ['#334155', '#cbd5e1'], sea: '#475569', seed: 23, crane: false }), 'airport.jpg'),
  border: await up(port({ sky: ['#78350f', '#fde68a'], sea: '#a16207', seed: 29, crane: false }), 'border.jpg'),
  card: await up(paper({ from: '#ccfbf1', to: '#0e7490', stamp: '#0e7490', mark: 'ICCIMA' }), 'card.jpg'),
  ntsw: await up(paper({ from: '#e0f2fe', to: '#1d4ed8', stamp: '#1d4ed8', mark: 'NTSW' }), 'ntsw.jpg'),
  bank: await up(paper({ from: '#fef3c7', to: '#b45309', stamp: '#b45309', mark: 'FX' }), 'bank.jpg'),
  bl: await up(paper({ from: '#e2e8f0', to: '#334155', stamp: '#334155', mark: 'B/L' }), 'bl.jpg'),
  epl: await up(paper({ from: '#ede9fe', to: '#6d28d9', stamp: '#6d28d9', mark: 'EPL' }), 'epl.jpg'),
  route: await up(paper({ from: '#dcfce7', to: '#15803d', stamp: '#15803d', mark: 'OK' }), 'route.jpg'),
  license: await up(paper({ from: '#bbf7d0', to: '#065f46', stamp: '#065f46', mark: 'EXIT' }), 'license.jpg'),
};
img.before = await up(port({ sky: ['#3f3f46', '#a1a1aa'], sea: '#52525b', seed: 41 }), 'before.jpg');
img.after = await up(port({ sky: ['#065f46', '#5eead4'], sea: '#134e4a', seed: 41 }), 'after.jpg');
const people = {
  aliBg: await upload(await photo({ width: 1920, height: 1080, from: '#0b1324', to: '#0e7490' }), 'ali-bg.webp', 'image/webp'),
  sanazBg: await upload(await photo({ width: 1920, height: 1080, from: '#0b1324', to: '#b45309' }), 'sanaz-bg.webp', 'image/webp'),
  ali: await upload(await cutout({ color: '#0e7490' }), 'ali-card.webp', 'image/webp'),
  sanaz: await upload(await cutout({ color: '#b45309' }), 'sanaz-card.webp', 'image/webp'),
  aliEn: await upload(await nameTag('ALI'), 'ali-en.png', 'image/png'),
  sanazEn: await upload(await nameTag('SANAZ'), 'sanaz-en.png', 'image/png'),
  aliFa: await upload(await nameTag('علی'), 'ali-fa.png', 'image/png'),
  sanazFa: await upload(await nameTag('ساناز'), 'sanaz-fa.png', 'image/png'),
};

// ---------- Content ----------
const t = (en, fa) => (l) => (l === 'en' ? en : fa);
const ALI_TEL = 'tel:+989128158328';
const SANAZ_TEL = 'tel:+989126164436';

const blocks = (l) => [
  {
    id: 'hero',
    type: 'aurora-hero',
    props: {
      anchor: 'top',
      eyebrow: t('Mazaheri Trading · Customs clearance in Iran', 'بازرگانی مظاهری · ترخیص کالا از گمرکات ایران')(l),
      title: t('Your goods have landed. Clear them without', 'کالایتان رسید؟ ترخیصش کنید، بدون')(l),
      words: t('the confusion,the demurrage,the fines,the guesswork', 'سردرگمی,دموراژ,جریمه,دوباره‌کاری')(l),
      text: t(
        'A step-by-step guide to Iranian customs, written by people who stand at the counters every day — and a team that can take the whole file off your hands.',
        'راهنمای قدم‌به‌قدم گمرک ایران، نوشته‌ی کسانی که هر روز پشت باجه‌های گمرک ایستاده‌اند؛ و تیمی که می‌تواند کل پرونده را از دوش شما بردارد.',
      )(l),
      buttonLabel: t('Read the guide', 'شروع راهنما')(l),
      buttonLink: '#story',
      secondButtonLabel: t('Free consultation', 'مشاوره‌ی رایگان')(l),
      secondButtonLink: '#contact',
      color: '#f59e0b',
      look: 'dark',
    },
  },
  {
    id: 'cargo',
    type: 'logo-strip',
    props: {
      title: t('Goods we clear every month', 'کالاهایی که هر ماه ترخیص می‌کنیم')(l),
      logos: t(
        [
          'Industrial machinery',
          'Spare parts',
          'Medical equipment',
          'Food ingredients',
          'Petrochemicals',
          'Electronics',
          'Textiles',
          'Cosmetics',
          'Building materials',
          'Home appliances',
        ],
        [
          'ماشین‌آلات صنعتی',
          'قطعات یدکی',
          'تجهیزات پزشکی',
          'مواد اولیه‌ی غذایی',
          'پتروشیمی',
          'الکترونیک',
          'نساجی',
          'آرایشی و بهداشتی',
          'مصالح ساختمانی',
          'لوازم خانگی',
        ],
      )(l).map((name) => ({ image: '', name, link: '' })),
      seconds: 35,
      twoRows: true,
      look: 'dark',
    },
  },
  {
    id: 'story',
    type: 'scroll-text',
    props: {
      anchor: 'story',
      eyebrow: t('Chapter one · Kian’s container', 'فصل اول · کانتینر کیان')(l),
      text: t(
        'At six in the morning, Kian’s forty-foot container was lifted off the ship at Shahid Rajaee port. Inside were twelve industrial coffee machines from Milan. He had paid the seller, the ship had arrived on time, and he thought the hard part was over. In fact, the real journey had just begun.',
        'ساعت شش صبح، کانتینر چهل‌فوتی کیان در بندر شهید رجایی از کشتی تخلیه شد. داخلش دوازده دستگاه قهوه‌ی صنعتی از میلان بود. پول فروشنده را داده بود، کشتی به‌موقع رسیده بود و فکر می‌کرد سختی کار تمام شده. اما سفر واقعی تازه شروع شده بود.',
      )(l),
    },
  },
  {
    id: 'port',
    type: 'zoom-reveal',
    props: {
      anchor: 'port',
      intro: t('Shahid Rajaee port, 6:00 a.m.', 'بندر شهید رجایی، ساعت ۶ صبح')(l),
      eyebrow: t('Where every file starts', 'جایی که هر پرونده شروع می‌شود')(l),
      title: t('Arriving is not the same as clearing', 'رسیدن کالا با ترخیص آن یکی نیست')(l),
      text: t(
        'From the moment goods are unloaded they sit in a customs warehouse, and every day costs storage — plus demurrage if the container belongs to the shipping line. The clock is already running.',
        'از لحظه‌ی تخلیه، کالا در انبار گمرک می‌ماند و هر روزش هزینه‌ی انبارداری دارد؛ اگر کانتینر مال کشتیرانی باشد، دموراژ هم اضافه می‌شود. ساعت از همین حالا شروع به شمردن کرده است.',
      )(l),
      buttonLabel: t('See the road ahead', 'مسیر پیش رو را ببینید')(l),
      buttonLink: '#road',
      image: img.dawn,
    },
  },
  {
    id: 'what',
    type: 'split-reveal',
    props: {
      image: img.night,
      coverTitle: t('Customs', 'گمرک')(l),
      eyebrow: t('In plain words', 'به زبان ساده')(l),
      title: t('What does “clearance” actually mean?', 'ترخیص کالا دقیقاً یعنی چه؟')(l),
      text: t(
        'Clearance is the set of formalities that turns goods sitting in a customs warehouse into goods you legally own in Iran: declaring them, proving their value and origin, getting the permits their tariff code needs, paying import duties, and receiving the green customs licence that opens the exit gate.',
        'ترخیص یعنی مجموعه‌ی تشریفاتی که کالای مانده در انبار گمرک را به کالای قانونی شما در ایران تبدیل می‌کند: اظهار کالا، اثبات ارزش و مبدأ، گرفتن مجوزهایی که کد تعرفه‌اش لازم دارد، پرداخت حقوق ورودی و در نهایت گرفتن پروانه‌ی سبز گمرکی که درب خروج را باز می‌کند.',
      )(l),
      buttonLabel: t('Step by step', 'قدم‌به‌قدم')(l),
      buttonLink: '#road',
      direction: 'sideways',
    },
  },
  {
    id: 'road',
    type: 'sticky-story',
    props: {
      anchor: 'road',
      title: t('Kian’s road, step by step', 'مسیر کیان، قدم‌به‌قدم')(l),
      imageSide: 'start',
      steps: [
        {
          image: img.card,
          eyebrow: t('Step 1 · Before buying', 'گام ۱ · پیش از خرید')(l),
          title: t('A commercial card', 'کارت بازرگانی')(l),
          text: t(
            'Commercial imports in Iran need a valid commercial card issued by the Chamber of Commerce. Kian didn’t have one, so the order was registered on Mazaheri Trading’s card — Ali Mazaheri and Sanaz Riazi both hold one.',
            'واردات تجاری در ایران کارت بازرگانی معتبر می‌خواهد که اتاق بازرگانی صادر می‌کند. کیان کارت نداشت؛ ثبت سفارش با کارت بازرگانی مظاهری انجام شد. علی مظاهری و ساناز ریاضی هر دو کارت بازرگانی دارند.',
          )(l),
        },
        {
          image: img.ntsw,
          eyebrow: t('Step 2 · Before shipping', 'گام ۲ · پیش از حمل')(l),
          title: t('Order registration (NTSW)', 'ثبت سفارش در سامانه‌ی جامع تجارت')(l),
          text: t(
            'With the seller’s proforma invoice and the right HS tariff code, the order is registered on the National Trade Single Window. The tariff code decides the duty rate and which permits you will need, so it is worth getting right first time.',
            'با پیش‌فاکتور (پروفرما) فروشنده و کد تعرفه‌ی درست (HS Code)، سفارش در سامانه‌ی جامع تجارت ثبت می‌شود. کد تعرفه نرخ حقوق ورودی و مجوزهای لازم را تعیین می‌کند؛ پس باید از همان اول درست انتخاب شود.',
          )(l),
        },
        {
          image: img.bank,
          eyebrow: t('Step 3 · Paying the seller', 'گام ۳ · پرداخت به فروشنده')(l),
          title: t('Foreign currency', 'تأمین ارز')(l),
          text: t(
            'The currency route — through the bank and the central bank’s system, or “without currency transfer” where allowed — is chosen at registration and must match the paperwork at customs.',
            'روش تأمین ارز (از مسیر بانک و سامانه‌ی بانک مرکزی، یا «بدون انتقال ارز» در جایی که مجاز است) هنگام ثبت سفارش انتخاب می‌شود و باید با اسنادی که بعداً به گمرک می‌رسد بخواند.',
          )(l),
        },
        {
          image: img.bl,
          eyebrow: t('Step 4 · On the water', 'گام ۴ · روی آب')(l),
          title: t('Shipping documents', 'اسناد حمل')(l),
          text: t(
            'Bill of lading, commercial invoice, packing list, certificate of origin and insurance. Names, weights and values must agree across all of them — one typo can send a file to the red lane.',
            'بارنامه، سیاهه‌ی تجاری (اینویس)، لیست عدل‌بندی، گواهی مبدأ و بیمه‌نامه. نام، وزن و ارزش باید در همه‌ی آن‌ها یکی باشد؛ یک غلط تایپی می‌تواند پرونده را به مسیر قرمز بفرستد.',
          )(l),
        },
        {
          image: img.dawn,
          eyebrow: t('Step 5 · Arrival', 'گام ۵ · رسیدن کالا')(l),
          title: t('Warehouse receipt', 'قبض انبار')(l),
          text: t(
            'Once the ship’s manifest is filed and the container unloaded, the port issues a warehouse receipt. From here on, storage charges grow every day.',
            'با ثبت مانیفست کشتی و تخلیه‌ی کانتینر، قبض انبار صادر می‌شود. از اینجا به بعد هزینه‌ی انبارداری روزبه‌روز بیشتر می‌شود.',
          )(l),
        },
        {
          image: img.epl,
          eyebrow: t('Step 6 · Declaring', 'گام ۶ · اظهار کالا')(l),
          title: t('The customs declaration', 'اظهارنامه در سامانه‌ی جامع گمرکی')(l),
          text: t(
            'A licensed customs broker, acting on your power of attorney, files the declaration in the customs system (EPL). It receives a declaration number — the “cotage” — that follows the file to the end.',
            'حق‌العمل‌کار گمرکی با وکالت شما، اظهارنامه را در سامانه‌ی جامع گمرکی (EPL) ثبت می‌کند. پرونده یک شماره‌ی کوتاژ می‌گیرد که تا آخر همراهش است.',
          )(l),
        },
        {
          image: img.route,
          eyebrow: t('Step 7 · Inspection', 'گام ۷ · ارزیابی')(l),
          title: t('Green, yellow or red lane', 'مسیر سبز، زرد یا قرمز')(l),
          text: t(
            'The system assigns a lane. Green: no inspection. Yellow: the documents are checked. Red: the container is opened and the goods examined and valued by an inspector.',
            'سامانه مسیر پرونده را تعیین می‌کند. سبز: بدون بازرسی. زرد: کنترل اسناد. قرمز: کانتینر باز می‌شود و کارشناس گمرک کالا را معاینه و ارزش‌گذاری می‌کند.',
          )(l),
        },
        {
          image: img.license,
          eyebrow: t('Step 8 · The exit gate', 'گام ۸ · درب خروج')(l),
          title: t('Duties, licence, exit', 'پرداخت، پروانه، خروج')(l),
          text: t(
            'Once permits are in and import duties, commercial profit and VAT are paid, customs issues the green licence. The truck is loaded and leaves through the exit gate.',
            'وقتی مجوزها رسید و حقوق ورودی، سود بازرگانی و مالیات بر ارزش افزوده پرداخت شد، پروانه‌ی سبز گمرکی صادر می‌شود. کامیون بارگیری می‌شود و از درب خروج بیرون می‌رود.',
          )(l),
        },
      ],
    },
  },
  {
    id: 'lanes',
    type: 'stacking-cards',
    props: {
      anchor: 'lanes',
      title: t('Three colours decide your week', 'سه رنگ که هفته‌ی شما را تعیین می‌کنند')(l),
      cards: [
        {
          image: img.route,
          eyebrow: '01',
          title: t('Green lane: trusted and fast', 'مسیر سبز: اعتماد و سرعت')(l),
          text: t(
            'No physical inspection and only a light document check. Clean, consistent paperwork and a good importer history are what lead here.',
            'بدون معاینه‌ی فیزیکی و تنها با کنترل سبک اسناد. اسناد تمیز و هماهنگ و سابقه‌ی خوب واردکننده پرونده را به این مسیر می‌برد.',
          )(l),
          color: '#065f46',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.bl,
          eyebrow: '02',
          title: t('Yellow lane: the documents speak', 'مسیر زرد: اسناد حرف می‌زنند')(l),
          text: t(
            'An inspector reviews the invoice, origin and tariff code without opening the container. Answers ready in advance save days here.',
            'کارشناس گمرک بدون باز کردن کانتینر، فاکتور، مبدأ و کد تعرفه را بررسی می‌کند. پاسخ‌های آماده از قبل، اینجا چند روز صرفه‌جویی می‌کند.',
          )(l),
          color: '#a16207',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.night,
          eyebrow: '03',
          title: t('Red lane: open the container', 'مسیر قرمز: درِ کانتینر باز می‌شود')(l),
          text: t(
            'Physical examination: count, weight, model and value are checked against the declaration. Our people are at the inspection so nothing is assumed.',
            'معاینه‌ی فیزیکی: تعداد، وزن، مدل و ارزش با اظهارنامه مقایسه می‌شود. نماینده‌ی ما سر معاینه حاضر است تا چیزی به حدس واگذار نشود.',
          )(l),
          color: '#9f1239',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: img.license,
          eyebrow: '04',
          title: t('The green licence', 'پروانه‌ی سبز گمرکی')(l),
          text: t(
            'Whatever the colour, the goal is the same document: the customs licence that lets your goods leave legally.',
            'رنگ مسیر هر چه باشد، مقصد یک سند است: پروانه‌ی گمرکی که اجازه‌ی خروج قانونی کالا را می‌دهد.',
          )(l),
          color: '#0f172a',
          buttonLabel: t('Ask about your file', 'درباره‌ی پرونده‌تان بپرسید')(l),
          buttonLink: '#contact',
        },
      ],
    },
  },
  {
    id: 'docs',
    type: 'flip-cards',
    props: {
      anchor: 'docs',
      animation: 'flip',
      title: t('The document folder — turn each card over', 'پوشه‌ی اسناد؛ هر کارت را برگردانید')(l),
      items: [
        [
          img.ntsw,
          t('Proforma invoice', 'پیش‌فاکتور (پروفرما)'),
          t(
            'Issued by the seller before purchase; the basis of order registration. Price, quantity and Incoterm must be exact.',
            'پیش از خرید از فروشنده گرفته می‌شود و پایه‌ی ثبت سفارش است. قیمت، تعداد و شرط تحویل (اینکوترمز) باید دقیق باشد.',
          ),
        ],
        [
          img.bank,
          t('Commercial invoice', 'سیاهه‌ی تجاری'),
          t(
            'The final invoice. Customs compares it line by line with the registered order — differences mean questions.',
            'فاکتور نهایی. گمرک آن را سطربه‌سطر با ثبت سفارش مقایسه می‌کند؛ هر اختلاف یعنی سؤال.',
          ),
        ],
        [
          img.bl,
          t('Bill of lading', 'بارنامه'),
          t(
            'Proof of shipment and ownership of the cargo. Consignee and notify party must match the card holder.',
            'سند حمل و مالکیت محموله. نام گیرنده باید با دارنده‌ی کارت بازرگانی یکی باشد.',
          ),
        ],
        [
          img.card,
          t('Certificate of origin', 'گواهی مبدأ'),
          t(
            'Proves where the goods were made. It can change the duty rate under trade agreements.',
            'کشور سازنده را ثابت می‌کند و در موافقت‌نامه‌های تجاری می‌تواند نرخ حقوق ورودی را تغییر دهد.',
          ),
        ],
        [
          img.epl,
          t('Packing list', 'لیست عدل‌بندی'),
          t(
            'What is in each package, with weights. Inspectors use it in the yellow and red lanes.',
            'محتوای هر بسته به همراه وزن. کارشناس در مسیر زرد و قرمز از آن استفاده می‌کند.',
          ),
        ],
        [
          img.route,
          t('Insurance policy', 'بیمه‌نامه'),
          t(
            'Cargo insurance. Its value also enters the customs value used for duties.',
            'بیمه‌ی باربری. مبلغ آن در ارزش گمرکی و محاسبه‌ی حقوق ورودی هم اثر دارد.',
          ),
        ],
      ].map(([image, title, back]) => ({ image, title: title(l), back: back(l), buttonLabel: '', buttonLink: '' })),
    },
  },
  {
    id: 'permits',
    type: 'orbit',
    props: {
      anchor: 'permits',
      eyebrow: t('Depends on the tariff code', 'بسته به کد تعرفه')(l),
      title: t('The permits that may stand in the way', 'مجوزهایی که ممکن است سر راه باشند')(l),
      text: t(
        'Kian’s coffee machines needed a standards certificate. Food needs the Food & Drug Organization, live plants need plant quarantine. We tell you on day one which ones your goods will need.',
        'دستگاه‌های قهوه‌ی کیان گواهی استاندارد لازم داشتند. مواد غذایی سازمان غذا و دارو، و گیاه قرنطینه‌ی گیاه‌پزشکی. ما از روز اول می‌گوییم کالای شما کدام‌ها را لازم دارد.',
      )(l),
      buttonLabel: t('Check my goods', 'بررسی کالای من')(l),
      buttonLink: '#contact',
      items: [
        ['mdi-certificate-outline', t('Standards organization', 'سازمان ملی استاندارد')],
        ['mdi-pill', t('Food & Drug Organization', 'سازمان غذا و دارو')],
        ['mdi-cow', t('Veterinary quarantine', 'قرنطینه‌ی دامپزشکی')],
        ['mdi-sprout-outline', t('Plant protection', 'گیاه‌پزشکی')],
        ['mdi-leaf', t('Environment', 'محیط زیست')],
        ['mdi-factory', t('Ministry of Industry', 'وزارت صمت')],
        ['mdi-radioactive', t('Atomic Energy Org.', 'سازمان انرژی اتمی')],
        ['mdi-cellphone-wireless', t('Telecom regulator', 'سازمان تنظیم مقررات')],
        ['mdi-medical-bag', t('Medical devices', 'تجهیزات پزشکی')],
        ['mdi-shield-check-outline', t('Security clearance', 'مجوزهای امنیتی')],
      ].map(([icon, name]) => ({ image: '', icon, name: name(l) })),
      seconds: 45,
    },
  },
  {
    id: 'mistakes',
    type: 'text-scramble',
    props: {
      eyebrow: t('Chapter two · Where files get stuck', 'فصل دوم · جایی که پرونده‌ها گیر می‌کنند')(l),
      lines: t(
        'The wrong tariff code.\nA value that doesn’t add up.\nA permit asked for too late.\nA container left in the yard.',
        'کد تعرفه‌ی اشتباه.\nارزش اعلامی که جور درنمی‌آید.\nمجوزی که دیر درخواست شد.\nکانتینری که در محوطه جا ماند.',
      )(l),
      text: t(
        'Under Iran’s customs law, goods not cleared within the legal deadline can be declared abandoned and sold at auction. Most delays come from these four mistakes — and all four are avoidable.',
        'طبق قانون امور گمرکی، کالایی که در مهلت قانونی ترخیص نشود می‌تواند متروکه اعلام و به مزایده گذاشته شود. بیشتر تأخیرها از همین چهار اشتباه می‌آید؛ و هر چهار قابل پیشگیری‌اند.',
      )(l),
      buttonLabel: t('Have us review your documents', 'اسنادتان را بررسی کنیم')(l),
      buttonLink: '#contact',
      seconds: 3,
      look: 'dark',
    },
  },
  {
    id: 'ports',
    type: 'horizontal-scroll',
    props: {
      anchor: 'ports',
      title: t('The customs houses we know by heart', 'گمرکاتی که مثل کف دست می‌شناسیم')(l),
      text: t('Keep scrolling: from the Persian Gulf to the borders.', 'اسکرول کنید: از خلیج فارس تا مرزهای زمینی.')(l),
      cards: [
        [
          img.dawn,
          t('Sea', 'دریایی'),
          t('Shahid Rajaee port', 'بندر شهید رجایی'),
          t('Bandar Abbas · the country’s largest container port.', 'بندرعباس · بزرگ‌ترین بندر کانتینری کشور.'),
        ],
        [
          img.day,
          t('Sea', 'دریایی'),
          t('Imam Khomeini port', 'بندر امام خمینی'),
          t('Khuzestan · bulk goods and basic commodities.', 'خوزستان · کالای فله و کالاهای اساسی.'),
        ],
        [
          img.airport,
          t('Air', 'هوایی'),
          t('Imam Khomeini Airport', 'گمرک فرودگاه امام'),
          t('Tehran · urgent parts, medical and electronic goods.', 'تهران · قطعات فوری، کالای پزشکی و الکترونیک.'),
        ],
        [
          img.night,
          t('Inland', 'داخلی'),
          t('West Tehran customs', 'گمرک غرب تهران'),
          t('Shahriar · clearance close to the capital.', 'شهریار · ترخیص در نزدیکی پایتخت.'),
        ],
        [
          img.border,
          t('Land', 'زمینی'),
          t('Bazargan', 'گمرک بازرگان'),
          t('West Azerbaijan · goods by truck from Türkiye and Europe.', 'آذربایجان غربی · کالای زمینی از ترکیه و اروپا.'),
        ],
        [
          img.dusk,
          t('Land', 'زمینی'),
          t('Sarakhs', 'گمرک سرخس'),
          t('Khorasan · rail and road from Central Asia and China.', 'خراسان · ریلی و جاده‌ای از آسیای میانه و چین.'),
        ],
      ].map(([image, tag, title, text]) => ({ image, tag: tag(l), title: title(l), text: text(l), link: '' })),
    },
  },
  {
    id: 'team',
    type: 'spotlight',
    props: {
      anchor: 'team',
      people: [
        {
          name: t('Ali Mazaheri', 'علی مظاهری')(l),
          headline: t('Commercial card holder · Customs affairs', 'دارای کارت بازرگانی · امور گمرکی')(l),
          text: t(
            'Years at the counters of Shahid Rajaee and Imam Khomeini Airport. Ali handles declarations, inspections and the conversations with customs inspectors.',
            'سال‌ها حضور پشت باجه‌های گمرک شهید رجایی و فرودگاه امام. علی اظهار، معاینه و گفتگو با کارشناسان گمرک را پیش می‌برد.',
          )(l),
          photo: people.aliBg,
          mobilePhoto: '',
          cardPhoto: people.ali,
          cardLogo: l === 'en' ? people.aliEn : people.aliFa,
          color: '#0e7490',
          buttonLabel: t('Call Ali', 'تماس با علی')(l),
          buttonLink: ALI_TEL,
        },
        {
          name: t('Sanaz Riazi', 'ساناز ریاضی')(l),
          headline: t('Commercial card holder · Order registration & permits', 'دارای کارت بازرگانی · ثبت سفارش و مجوزها')(l),
          text: t(
            'Sanaz builds the file before the goods even ship: tariff codes, order registration, currency route and every permit your goods will need.',
            'ساناز پرونده را پیش از حمل کالا می‌سازد: کد تعرفه، ثبت سفارش، مسیر تأمین ارز و همه‌ی مجوزهایی که کالای شما لازم دارد.',
          )(l),
          photo: people.sanazBg,
          mobilePhoto: '',
          cardPhoto: people.sanaz,
          cardLogo: l === 'en' ? people.sanazEn : people.sanazFa,
          color: '#b45309',
          buttonLabel: t('Call Sanaz', 'تماس با ساناز')(l),
          buttonLink: SANAZ_TEL,
        },
      ],
      marquee: t('FAST · ACCURATE · LAWFUL CUSTOMS CLEARANCE', 'ترخیص سریع · دقیق · قانونی')(l),
      textSide: 'left',
      scrollHint: false,
    },
  },
  {
    id: 'services',
    type: 'tilt-cards',
    props: {
      anchor: 'services',
      animation: 'zoom',
      title: t('What we can take off your hands', 'کارهایی که از دوش شما برمی‌داریم')(l),
      items: [
        [
          'mdi-file-sign',
          t('Order registration', 'ثبت سفارش'),
          t('On our commercial cards, with the right tariff code from day one.', 'با کارت بازرگانی ما و کد تعرفه‌ی درست از روز اول.'),
        ],
        [
          'mdi-truck-check-outline',
          t('Final clearance', 'ترخیص قطعی'),
          t('Declaration, inspection, duties and the green licence.', 'اظهار، ارزیابی، پرداخت حقوق ورودی و پروانه‌ی سبز.'),
        ],
        [
          'mdi-clipboard-check-outline',
          t('Permits', 'اخذ مجوزها'),
          t('Standards, Food & Drug, quarantine and the rest.', 'استاندارد، غذا و دارو، قرنطینه و بقیه.'),
        ],
        [
          'mdi-swap-horizontal',
          t('Temporary import & transit', 'ورود موقت و ترانزیت'),
          t('For goods that are processed here or only pass through.', 'برای کالایی که اینجا فرآوری می‌شود یا فقط عبور می‌کند.'),
        ],
        [
          'mdi-calculator-variant-outline',
          t('Duty estimate', 'برآورد هزینه'),
          t('What you will pay at customs, before you buy.', 'پیش از خرید بدانید در گمرک چقدر می‌پردازید.'),
        ],
        [
          'mdi-scale-balance',
          t('Disputes', 'اختلافات گمرکی'),
          t('Valuation and tariff disputes, handled by the book.', 'اختلاف ارزش و تعرفه، از مسیر قانونی.'),
        ],
      ].map(([icon, title, text]) => ({ image: '', icon, title: title(l), text: text(l), link: '' })),
    },
  },
  {
    id: 'days',
    type: 'timeline',
    props: {
      anchor: 'days',
      title: t('Chapter three · Kian’s six days', 'فصل سوم · شش روزِ کیان')(l),
      items: [
        {
          date: t('Day 0', 'روز ۰')(l),
          title: t('One phone call', 'یک تماس تلفنی')(l),
          text: t(
            'Kian sends photos of his documents. Sanaz spots that the invoice weight differs from the bill of lading.',
            'کیان عکس اسنادش را می‌فرستد. ساناز می‌بیند وزن فاکتور با بارنامه فرق دارد.',
          )(l),
        },
        {
          date: t('Day 1', 'روز ۱')(l),
          title: t('Power of attorney & correction', 'وکالت‌نامه و اصلاح')(l),
          text: t(
            'The seller sends a corrected invoice. The broker’s power of attorney is registered.',
            'فروشنده فاکتور اصلاح‌شده می‌فرستد. وکالت حق‌العمل‌کار ثبت می‌شود.',
          )(l),
        },
        {
          date: t('Day 2', 'روز ۲')(l),
          title: t('Declaration filed', 'ثبت اظهارنامه')(l),
          text: t(
            'The declaration goes into EPL and gets its cotage number. The lane: yellow.',
            'اظهارنامه در EPL ثبت می‌شود و کوتاژ می‌گیرد. مسیر: زرد.',
          )(l),
        },
        {
          date: t('Day 3', 'روز ۳')(l),
          title: t('Document review', 'کنترل اسناد')(l),
          text: t(
            'Ali answers the inspector’s questions on the spot, with the catalogue already in hand.',
            'علی با کاتالوگی که از قبل آماده بود، همان‌جا به پرسش‌های کارشناس جواب می‌دهد.',
          )(l),
        },
        {
          date: t('Day 5', 'روز ۵')(l),
          title: t('Standards certificate', 'گواهی استاندارد')(l),
          text: t(
            'Requested on day 0, so it arrives without holding the file back.',
            'از روز صفر درخواست شده بود، پس بدون معطل کردن پرونده می‌رسد.',
          )(l),
        },
        {
          date: t('Day 6', 'روز ۶')(l),
          title: t('Through the exit gate', 'عبور از درب خروج')(l),
          text: t(
            'Duties paid, green licence issued, truck on its way to Tehran.',
            'حقوق ورودی پرداخت شد، پروانه صادر شد و کامیون راهی تهران شد.',
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
      title: t('Kian’s first container, and his second', 'کانتینر اول کیان، و کانتینر دومش')(l),
      before: img.before,
      after: img.after,
      beforeLabel: t('On his own: 23 days', 'خودش: ۲۳ روز')(l),
      afterLabel: t('With us: 6 days', 'با ما: ۶ روز')(l),
    },
  },
  {
    id: 'numbers',
    type: 'counters',
    props: {
      animation: 'rise',
      title: t('Mazaheri Trading in numbers', 'بازرگانی مظاهری به زبان عدد')(l),
      items: [
        { value: 15, prefix: '', suffix: '+', label: t('Years in customs', 'سال سابقه در گمرک')(l) },
        { value: 2400, prefix: '', suffix: '+', label: t('Files cleared', 'پرونده‌ی ترخیص‌شده')(l) },
        { value: 2, prefix: '', suffix: '', label: t('Commercial cards', 'کارت بازرگانی فعال')(l) },
        { value: 12, prefix: '', suffix: '', label: t('Customs houses', 'گمرک فعال')(l) },
      ],
    },
  },
  {
    id: 'share',
    type: 'progress-bars',
    props: {
      title: t('Where our files clear', 'پرونده‌های ما از کجا ترخیص می‌شوند')(l),
      text: t('Share of last year’s files by customs house.', 'سهم پرونده‌های سال گذشته به تفکیک گمرک.')(l),
      items: [
        { label: t('Shahid Rajaee port', 'بندر شهید رجایی')(l), value: 46 },
        { label: t('Imam Khomeini Airport', 'فرودگاه امام خمینی')(l), value: 22 },
        { label: t('West Tehran', 'غرب تهران')(l), value: 15 },
        { label: t('Imam Khomeini port', 'بندر امام خمینی')(l), value: 9 },
        { label: t('Land borders', 'مرزهای زمینی')(l), value: 8 },
      ],
    },
  },
  {
    id: 'words',
    type: 'testimonials',
    props: {
      title: t('From people who’ve been through it', 'از زبان کسانی که این راه را رفته‌اند')(l),
      seconds: 7,
      items: [
        {
          quote: t(
            'My first container sat in the yard for three weeks. The second one left in six days, and I never set foot in Bandar Abbas.',
            'کانتینر اولم سه هفته در محوطه ماند. دومی شش روزه بیرون آمد و من حتی پایم به بندرعباس نرسید.',
          )(l),
          name: t('Kian R.', 'کیان ر.')(l),
          role: t('Coffee equipment importer', 'واردکننده‌ی تجهیزات قهوه')(l),
          photo: '',
        },
        {
          quote: t(
            'Sanaz told us which permit we’d need before we even paid the supplier. That one call saved us a month.',
            'ساناز قبل از اینکه پول تأمین‌کننده را بدهیم گفت چه مجوزی لازم داریم. همان یک تماس یک ماه جلو انداختمان.',
          )(l),
          name: t('Mahsa T.', 'مهسا ت.')(l),
          role: t('Medical supplies', 'تجهیزات پزشکی')(l),
          photo: '',
        },
        {
          quote: t(
            'Red lane, opened container, and Ali was standing right there. No surprises in the valuation.',
            'مسیر قرمز، کانتینر باز شد و علی همان‌جا ایستاده بود. هیچ غافلگیری‌ای در ارزش‌گذاری نداشتیم.',
          )(l),
          name: t('Reza K.', 'رضا ک.')(l),
          role: t('Industrial parts', 'قطعات صنعتی')(l),
          photo: '',
        },
      ],
    },
  },
  {
    id: 'faq',
    type: 'faq',
    props: {
      anchor: 'faq',
      animation: 'rise',
      title: t('Questions everyone asks', 'پرسش‌هایی که همه می‌پرسند')(l),
      subtitle: t(
        'Short answers. Every file is different — call us for yours.',
        'پاسخ‌های کوتاه. هر پرونده فرق دارد؛ برای پرونده‌ی خودتان تماس بگیرید.',
      )(l),
      items: [
        [
          t('Can I import without a commercial card?', 'بدون کارت بازرگانی می‌توانم کالا وارد کنم؟'),
          t(
            'For commercial imports a card is required. Many importers register the order on the card of a trading company like ours, which then clears the goods for them.',
            'برای واردات تجاری کارت بازرگانی لازم است. بسیاری از واردکنندگان ثبت سفارش را با کارت یک شرکت بازرگانی مثل ما انجام می‌دهند و ترخیص هم توسط همان شرکت انجام می‌شود.',
          ),
        ],
        [
          t('What is a cotage number?', 'کوتاژ چیست؟'),
          t(
            'The number customs gives your declaration. With it you can follow the file and its payments.',
            'شماره‌ای که گمرک به اظهارنامه‌ی شما می‌دهد. با آن می‌توانید وضعیت پرونده و پرداخت‌ها را دنبال کنید.',
          ),
        ],
        [
          t('What is demurrage?', 'دموراژ چیست؟'),
          t(
            'A daily charge from the shipping line for keeping its container beyond the free days. It is separate from port storage.',
            'هزینه‌ی روزانه‌ای که کشتیرانی برای نگه داشتن کانتینرش بیش از روزهای رایگان می‌گیرد؛ جدا از هزینه‌ی انبارداری بندر.',
          ),
        ],
        [
          t('What makes goods “abandoned”?', 'کالای متروکه یعنی چه؟'),
          t(
            'Goods not cleared within the deadline set by the customs law can be declared abandoned and sold at auction. Don’t let a file sit.',
            'کالایی که در مهلت قانون امور گمرکی ترخیص نشود، می‌تواند متروکه اعلام و به مزایده گذاشته شود. پرونده را رها نکنید.',
          ),
        ],
        [
          t('How long does clearance take?', 'ترخیص چقدر طول می‌کشد؟'),
          t(
            'With complete documents and permits requested early, many files clear within a week. Missing permits are the most common cause of long delays.',
            'با اسناد کامل و مجوزهایی که زود درخواست شده، بسیاری از پرونده‌ها کمتر از یک هفته ترخیص می‌شوند. کمبود مجوز رایج‌ترین دلیل تأخیرهای طولانی است.',
          ),
        ],
        [
          t('What do I pay at customs?', 'در گمرک چه چیزهایی پرداخت می‌شود؟'),
          t(
            'Import duties (customs duty plus commercial profit, by tariff code), VAT and a few small fees — plus port storage and broker fees. We give you an estimate before you buy.',
            'حقوق ورودی (حقوق گمرکی و سود بازرگانی بر اساس کد تعرفه)، مالیات بر ارزش افزوده و چند عوارض جزئی؛ به‌علاوه‌ی انبارداری و حق‌العمل‌کاری. پیش از خرید برآورد می‌دهیم.',
          ),
        ],
      ].map(([q, a]) => ({ q: q(l), a: a(l) })),
    },
  },
  {
    id: 'motto',
    type: 'scroll-marquee',
    props: {
      rows: [
        { text: t('Order registration · Declaration · Licence', 'ثبت سفارش · اظهار · پروانه')(l), style: 'solid' },
        { text: t('Mazaheri Trading', 'بازرگانی مظاهری')(l), style: 'outline' },
        { text: t('From the port to your warehouse', 'از بندر تا انبار شما')(l), style: 'accent' },
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
      title: t('Is your container already at the port?', 'کانتینرتان رسیده؟')(l),
      text: t(
        'Send us your bill of lading and invoice. Within one working day we’ll tell you the tariff code, the permits and an estimate of what you’ll pay.',
        'بارنامه و فاکتورتان را بفرستید. ظرف یک روز کاری کد تعرفه، مجوزهای لازم و برآورد هزینه را به شما می‌گوییم.',
      )(l),
      email: 'info@mazaheri-trading.ir',
      phone: t('Ali Mazaheri +98 912 815 8328 · Sanaz Riazi +98 912 616 4436', 'علی مظاهری ۰۹۱۲۸۱۵۸۳۲۸ · ساناز ریاضی ۰۹۱۲۶۱۶۴۴۳۶')(l),
      address: t(
        'Tehran, Iran — with representatives at Bandar Abbas and Imam Khomeini Airport',
        'تهران — با نماینده در بندرعباس و فرودگاه امام خمینی',
      )(l),
      copyright: t('© Mazaheri Trading', '© بازرگانی مظاهری')(l),
    },
  },
];

// ---------- Save ----------
const theme = {
  primary: '#f59e0b',
  secondary: '#0e7490',
  dark: '#0b1324',
  background: '#0b1324',
  headerStyle: 'solid',
  cursor: 'default',
  pageTransition: 'curtain',
};
const titles = {
  en: 'Mazaheri Trading — Customs clearance in Iran',
  fa: 'بازرگانی مظاهری — ترخیص کالا از گمرکات ایران',
};
const seo = {
  en: {
    seoTitle: 'Customs clearance in Iran, step by step | Mazaheri Trading',
    seoDescription:
      'A step-by-step guide to clearing goods through Iranian customs: commercial card, order registration, declaration, green/yellow/red lanes, permits and duties.',
  },
  fa: {
    seoTitle: 'راهنمای ترخیص کالا از گمرک ایران | بازرگانی مظاهری',
    seoDescription:
      'راهنمای قدم‌به‌قدم ترخیص کالا از گمرک ایران: کارت بازرگانی، ثبت سفارش، اظهار، مسیر سبز و زرد و قرمز، مجوزها و حقوق ورودی.',
  },
};
const LOCALES = ['en', 'fa'];
const pages = await api('GET', '/admin/pages');
let page;
let slugs;

if (HOME) {
  page = pages.find((p) => p.isHome);
  slugs = Object.fromEntries(LOCALES.map((l) => [l, page.translations.find((x) => x.locale === l)?.slug ?? '']));
  const settings = await api('GET', '/admin/settings');
  await api('PUT', '/admin/settings', {
    siteName: { fa: 'بازرگانی مظاهری', en: 'Mazaheri Trading' },
    logo: settings.logo,
    favicon: settings.favicon,
    theme: { ...settings.theme, ...theme },
    menu: [
      { href: '#road', label: { fa: 'مسیر ترخیص', en: 'The road' } },
      { href: '#docs', label: { fa: 'اسناد', en: 'Documents' } },
      { href: '#permits', label: { fa: 'مجوزها', en: 'Permits' } },
      { href: '#team', label: { fa: 'تیم ما', en: 'Our team' } },
      { href: '#faq', label: { fa: 'پرسش‌ها', en: 'FAQ' } },
      { href: '#contact', label: { fa: 'تماس', en: 'Contact' } },
    ],
    fonts: settings.fonts,
    savedThemes: settings.savedThemes,
    loader: settings.loader,
    maintenance: settings.maintenance,
    maintenanceText: settings.maintenanceText,
    business: {
      ...settings.business,
      phone: '+989128158328',
      email: 'info@mazaheri-trading.ir',
      city: 'Tehran',
      region: 'Tehran',
      country: 'IR',
    },
    notifyEmail: settings.notifyEmail,
  });
} else {
  const NAME = 'Mazaheri customs clearance';
  page = pages.find((p) => p.name === NAME) ?? (await api('POST', '/admin/pages', { name: NAME }));
  slugs = { en: 'customs-clearance', fa: 'ترخیص-کالا' };
}

await api('PATCH', `/admin/pages/${page.id}`, {
  name: page.name,
  // On its own page the colors belong to the page; with --home they are the site's.
  theme: HOME ? null : theme,
  translations: LOCALES.map((l) => ({ locale: l, slug: slugs[l], title: titles[l], ...seo[l], blocks: blocks(l) })),
});
await api('POST', `/admin/pages/${page.id}/publish`);
console.log(`Published: ${LOCALES.map((l) => `/${l}/${slugs[l]}`).join('  ')}`);
