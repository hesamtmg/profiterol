/**
 * Builds profiterol.ir in Persian and English: the site that sells Profiterol itself, a website for any business with
 * any feature it needs. It counts Profiterol's features (the numbers come from the block registry, so they stay
 * right as the builder grows), shows the twelve kinds of business it is made for with real photos, and shows the
 * real editor and admin in screenshots. Profiterol is also the company: the page shows its own products (Petshop Bahar,
 * Packeta, Dunga, GIMOO, client sites and the server they run on) and its founder, Hesam Tamjidi.
 *
 * The photos are from Unsplash (free to use, see scripts/profiterol-ir/CREDITS.md) and the screenshots are of
 * Profiterol itself; both are in scripts/profiterol-ir/, so nothing is downloaded while it runs.
 * It only talks to the admin API, so it works against a local site or a live one.
 *
 *   node scripts/seed-profiterol-ir.mjs           a separate page at /fa/ساخت-سایت and /en/website-builder (safe)
 *   node scripts/seed-profiterol-ir.mjs --home    replaces the home page, and sets the site name, menu and colors
 *
 * Settings: API_URL (default http://localhost:8080/api), ADMIN_EMAIL, ADMIN_PASSWORD, SITE (the site's address when
 * the installation has several sites, e.g. SITE=profiterol.ir), and CONTACT_EMAIL / CONTACT_PHONE for the footer
 * (left out of the page when not given).
 * Running it again updates the same page; the pictures are uploaded once (they are found by name the next time).
 * On the server, see the "profiterol.ir content" section of DEPLOY.md.
 */
import { existsSync, readFileSync } from 'node:fs';

/** The block registry: built next to this file in the repository, or in /app inside the API image. */
async function loadBlocks() {
  for (const path of [
    new URL('../packages/blocks/dist/esm/index.js', import.meta.url).pathname,
    '/app/packages/blocks/dist/esm/index.js',
  ]) {
    if (existsSync(path)) return import(path);
  }
  throw new Error('@profiterol/blocks is not built: run `npm run build -w @profiterol/blocks`, or run this inside the API container');
}
const {
  blocks: registry,
  businessCategories,
  entranceAnimations,
  headerStyles,
  loaderStyles,
  pageTemplates,
  siteTemplates,
  themeFonts,
  themeMotion,
  themePresets,
} = await loadBlocks();

const API = (process.env.API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const SITE = process.env.SITE ? { 'x-forwarded-host': process.env.SITE } : {};
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };
const HOME = process.argv.includes('--home');
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? '';
const CONTACT_PHONE = process.env.CONTACT_PHONE ?? '';
const DIR = new URL('./profiterol-ir/', import.meta.url).pathname;

// ---------- The numbers, counted from the code ----------
const N = {
  blocks: registry.length,
  families: new Set(registry.map((b) => b.category)).size,
  animated: registry.filter((b) => b.category === 'animated').length,
  themes: themePresets.length,
  pageTemplates: pageTemplates.length,
  siteTemplates: siteTemplates.length,
  businessCategories: businessCategories.length,
  businessTypes: businessCategories.reduce((n, c) => n + c.types.length, 0),
  fontsFa: themeFonts.fa.length,
  fontsEn: themeFonts.en.length,
  headers: headerStyles.length,
  loaders: loaderStyles.length,
  entrances: entranceAnimations.length,
  transitions: themeMotion.pageTransition.filter((o) => o.value !== 'none').length,
  cursors: themeMotion.cursor.filter((o) => o.value !== 'default').length,
  aiProviders: 8, // Anthropic, OpenAI, OpenRouter, Gemini, Groq, GapGPT, Ollama, any OpenAI-compatible (apps/api/src/ai/providers.ts)
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[d]);
/** A text in both languages; numbers inside `{}` are written with Persian digits in Persian. */
const t = (en, faText) => (l) => (l === 'fa' ? faText.replace(/\{(\d+)\}/g, (_, d) => fa(d)) : en.replace(/\{(\d+)\}/g, '$1'));

// ---------- Every feature, in groups ----------
const FEATURES = [
  {
    key: 'editor',
    image: 'product/editor.jpg',
    name: t('Visual editor', 'ویرایشگر دیداری'),
    items: [
      t('Drag blocks onto a live page', 'کشیدن بلوک‌ها روی صفحه‌ی زنده'),
      t('Click any text and type', 'روی هر متن کلیک کنید و بنویسید'),
      t('Desktop, tablet and phone previews', 'پیش‌نمایش دسکتاپ، تبلت و موبایل'),
      t('Undo, redo and shortcuts', 'برگشت، تکرار و میان‌برهای صفحه‌کلید'),
      t('Autosave', 'ذخیره‌ی خودکار'),
      t('Version history (last 50)', 'تاریخچه‌ی نسخه‌ها (۵۰ نسخه‌ی آخر)'),
      t('Draft, then publish', 'پیش‌نویس، سپس انتشار'),
      t('Scheduled publishing', 'انتشار زمان‌بندی‌شده'),
      t('Saved sections for other pages', 'ذخیره‌ی بخش‌ها برای صفحه‌های دیگر'),
      t('Copy blocks to another page', 'کپی بلوک‌ها به صفحه‌ی دیگر'),
      t('Columns and groups', 'ستون‌ها و گروه‌ها'),
      t('Phone-only or desktop-only blocks', 'بلوک فقط برای موبایل یا فقط دسکتاپ'),
      t('Editor in Persian and English', 'محیط ویرایش فارسی و انگلیسی'),
    ],
  },
  {
    key: 'blocks',
    image: 'photos/creative-team.jpg',
    name: t('Blocks and motion', 'بلوک‌ها و حرکت'),
    items: [
      t(`${N.blocks} ready blocks in ${N.families} families`, `{${N.blocks}} بلوک آماده در {${N.families}} خانواده`),
      t(`${N.animated} animated blocks`, `{${N.animated}} بلوک متحرک`),
      t(`${N.entrances} entrance animations`, `{${N.entrances}} انیمیشن ورود`),
      t(`${N.transitions} page transitions`, `{${N.transitions}} جلوه‌ی جابه‌جایی صفحه`),
      t(`${N.cursors} cursor effects`, `{${N.cursors}} جلوه‌ی نشانگر ماوس`),
      t(`${N.loaders} page loaders`, `{${N.loaders}} مدل صفحه‌ی بارگذاری`),
      t('Video player, YouTube and Aparat', 'پخش‌کننده‌ی ویدیو، یوتیوب و آپارات'),
      t('Galleries, sliders and before/after', 'گالری، اسلایدر و قبل و بعد'),
      t('Maps, pricing tables, FAQ and timelines', 'نقشه، جدول قیمت، پرسش‌های پرتکرار و خط زمان'),
    ],
  },
  {
    key: 'design',
    image: 'product/editor-themes.jpg',
    name: t('Design', 'طراحی'),
    items: [
      t(`${N.themes} ready-made themes`, `{${N.themes}} تم آماده`),
      t('Your own colors, corners and buttons', 'رنگ، گوشه و دکمه‌ی دلخواه'),
      t(`${N.headers} header styles`, `{${N.headers}} مدل سربرگ`),
      t(
        `${N.fontsFa + N.fontsEn} fonts (${N.fontsFa} Persian), served from your site`,
        `{${N.fontsFa + N.fontsEn}} فونت ({${N.fontsFa}} فارسی) از خود سایت`,
      ),
      t('Upload your own fonts', 'بارگذاری فونت خودتان'),
      t('Save your own themes', 'ذخیره‌ی تم‌های خودتان'),
      t('A different theme per page', 'تم جدا برای هر صفحه'),
      t('Custom CSS and HTML', 'CSS و HTML دلخواه'),
    ],
  },
  {
    key: 'languages',
    image: 'product/editor-fa.jpg',
    name: t('Two languages', 'دو زبان'),
    items: [
      t('Persian (right to left) and English on every page', 'فارسی (راست‌به‌چپ) و انگلیسی در هر صفحه'),
      t('The language switch keeps the same page', 'تغییر زبان روی همان صفحه'),
      t('Persian web addresses', 'نشانی‌های فارسی'),
      t('Persian digits', 'اعداد فارسی'),
    ],
  },
  {
    key: 'content',
    image: 'product/pages.jpg',
    name: t('Content and templates', 'محتوا و قالب‌ها'),
    items: [
      t('Blog, projects, products… as collections', 'وبلاگ، پروژه‌ها، محصولات… به‌صورت مجموعه'),
      t('Your own fields (9 kinds)', 'فیلدهای دلخواه (۹ نوع)'),
      t('List and item pages made for you', 'صفحه‌ی فهرست و جزئیات، خودکار'),
      t('Tags and filters', 'برچسب و فیلتر'),
      t(`${N.pageTemplates} page templates`, `{${N.pageTemplates}} قالب صفحه`),
      t(`${N.siteTemplates} whole-site templates`, `{${N.siteTemplates}} قالب کامل سایت`),
    ],
  },
  {
    key: 'media',
    image: 'product/media.jpg',
    name: t('Photos and video', 'عکس و ویدیو'),
    items: [
      t('Photos and videos up to 20 MB', 'عکس و ویدیو تا ۲۰ مگابایت'),
      t('WebP and AVIF in 4 sizes, made for you', 'نسخه‌ی WebP و AVIF در ۴ اندازه، خودکار'),
      t('Soft blur while a photo loads', 'تصویر محو تا بارگذاری عکس'),
      t('Folders, search and where each file is used', 'پوشه، جست‌وجو و محل استفاده‌ی هر فایل'),
    ],
  },
  {
    key: 'forms',
    image: 'photos/shop-checkout.jpg',
    name: t('Forms and messages', 'فرم‌ها و پیام‌ها'),
    items: [
      t('Contact forms with your own fields', 'فرم تماس با فیلدهای دلخواه'),
      t('Inbox with reply and Excel export', 'صندوق پیام با پاسخ و خروجی اکسل'),
      t('Email notifications', 'اطلاع‌رسانی با ایمیل'),
      t('Spam protection', 'جلوگیری از هرزنامه'),
    ],
  },
  {
    key: 'seo',
    image: 'product/seo.jpg',
    name: t('Google and SEO', 'گوگل و سئو'),
    items: [
      t('Title and description for every page', 'عنوان و توضیح برای هر صفحه'),
      t('Sitemap and robots.txt', 'نقشه‌ی سایت و robots.txt'),
      t('Google, Bing, Yandex and Baidu verification', 'تأیید گوگل، بینگ، یاندکس و بایدو'),
      t(`${N.businessTypes} business types for Google`, `{${N.businessTypes}} نوع کسب‌وکار برای گوگل`),
      t('Share pictures and both languages linked', 'عکس اشتراک‌گذاری و پیوند دو زبان'),
      t('Redirects (301/302)', 'تغییر مسیر (۳۰۱ و ۳۰۲)'),
      t('SEO check', 'بررسی سئو'),
    ],
  },
  {
    key: 'ai',
    image: 'product/ai-blocks.jpg',
    name: t('Blocks built by AI', 'بلوک‌سازی با هوش مصنوعی'),
    items: [
      t('Describe a block and AI builds it', 'بلوک را توصیف کنید، هوش مصنوعی می‌سازد'),
      t('Copy a section from any website', 'کپی یک بخش از هر وب‌سایت'),
      t(`${N.aiProviders} AI providers, GapGPT and free Ollama included`, `{${N.aiProviders}} سرویس هوش مصنوعی، با GapGPT و Ollama رایگان`),
    ],
  },
  {
    key: 'hosting',
    image: 'product/sites.jpg',
    name: t('Hosting and safety', 'میزبانی و امنیت'),
    items: [
      t('Your own domain with free SSL', 'دامنه‌ی خودتان با SSL رایگان'),
      t('A preview site before you buy', 'سایت پیش‌نمایش پیش از خرید'),
      t('Users and roles, by invitation', 'کاربران و نقش‌ها با دعوت‌نامه'),
      t('Sign-in protection', 'محافظت از ورود'),
      t('Nightly backups', 'پشتیبان‌گیری شبانه'),
      t('Security headers and protected forms', 'سرآیندهای امنیتی و فرم‌های محافظت‌شده'),
      t('Fast pages: cache and right-sized photos', 'صفحه‌های سریع: کش و عکس در اندازه‌ی مناسب'),
      t('Maintenance mode', 'حالت در دست تعمیر'),
      t('Several sites from one panel', 'چند سایت از یک پنل'),
    ],
  },
];
const FEATURE_COUNT = FEATURES.reduce((n, g) => n + g.items.length, 0);

// The twelve kinds of business the builder knows (packages/blocks/src/business.ts), each with a real photo.
const BUSINESS_PHOTOS = {
  food: 'restaurant',
  shop: 'clothing-shop',
  health: 'doctor',
  beauty: 'hair-salon',
  professional: 'lawyer',
  home: 'real-estate',
  auto: 'mechanic',
  lodging: 'hotel',
  education: 'classroom',
  leisure: 'gym',
  company: 'company-office',
  personal: 'creative-team',
};
for (const c of businessCategories) if (!BUSINESS_PHOTOS[c.key]) throw new Error(`No photo for the business category "${c.key}"`);

// ---------- The company and its founder ----------
// Profiterol is also the company: these are the products it builds and runs, and the person behind them.
const FOUNDER = {
  name: t('Hesam Tamjidi', 'حسام تمجیدی'),
  // From his LinkedIn profile.
  linkedin: 'https://www.linkedin.com/in/hesam-tamjidi-a097495a',
  role: t('Founder of Profiterol', 'بنیان‌گذار پروفیترول'),
  background: t(
    'Senior software development engineer at Parsian E-Commerce, working on payments and online shopping. Profiterol is where he builds his own products, and websites for businesses like yours: designed, written and run by the same hands, from the database to the last pixel on a phone.',
    'مهندس ارشد توسعه‌ی نرم‌افزار در تجارت الکترونیک پارسیان، در حوزه‌ی پرداخت و خرید آنلاین. پروفیترول جایی است که محصولات خودش را می‌سازد، و سایت کسب‌وکارهایی مثل شما را: طراحی، برنامه‌نویسی و نگه‌داری با یک دست، از پایگاه‌داده تا آخرین پیکسل روی موبایل.',
  ),
};

/**
 * Selected work, each with a 4:5 picture in scripts/profiterol-ir/work/ (screenshots of the real apps in a browser
 * frame; `fa: true` when there is a Persian one too). `status` sits beside the name; leave `link` empty for no link.
 */
const WORK = [
  {
    image: 'profiterol',
    fa: true,
    title: t('Profiterol', 'پروفیترول'),
    status: t('Live', 'آنلاین'),
    kind: t('Website builder', 'سایت‌ساز'),
    note: t('(You are on it)', '(همین سایت)'),
    tag: 'Nuxt · NestJS · AI',
    color: '#0f766e',
    link: '#features',
  },
  {
    image: 'shoppi',
    title: t('Petshop Bahar', 'پت‌شاپ بهار'),
    status: t('Live', 'آنلاین'),
    kind: t('Online shop, on our Shoppi platform', 'فروشگاه آنلاین، روی پلتفرم شاپی'),
    note: t('(1,500+ products, online payment)', '(بیش از ۱٬۵۰۰ محصول، پرداخت آنلاین)'),
    tag: 'E-commerce',
    color: '#9d174d',
    link: 'https://petshopbahar.com',
  },
  {
    image: 'packeta',
    fa: true,
    title: t('Packeta', 'پکتا'),
    status: t('Live', 'آنلاین'),
    kind: t('Multi-wallet fintech and payment gateway', 'کیف پول چندگانه و درگاه پرداخت'),
    note: t('(Double-entry ledger)', '(دفتر کل دوطرفه)'),
    tag: 'Fintech',
    color: '#1d4ed8',
    link: 'https://packeta.ir',
  },
  {
    image: 'dunga',
    title: t('Dunga', 'دونگا'),
    status: t('Live', 'آنلاین'),
    kind: t('Shared expenses app', 'اپ دونگ و خرج مشترک'),
    note: t('(Persian first, in Toman)', '(فارسی، به تومان)'),
    tag: 'Web app',
    color: '#047857',
    link: 'https://dunga.ir',
  },
  {
    image: 'gimoo',
    title: t('GIMOO', 'گیمو'),
    status: t('Live', 'آنلاین'),
    kind: t('Online multiplayer board games', 'بازی‌های گروهی آنلاین'),
    note: t('(5 games, in real time)', '(۵ بازی، هم‌زمان)'),
    tag: 'Games · Socket.io',
    color: '#6d28d9',
    link: 'https://gimoo.ir',
  },
  {
    image: 'fikkoprint',
    fa: true,
    title: t('FikkoPrint', 'فیکوپرینت'),
    status: t('Preview', 'پیش‌نمایش'),
    kind: t('Print studio, made with Profiterol', 'چاپخانه، ساخته‌شده با پروفیترول'),
    note: t('(A free preview site)', '(سایت پیش‌نمایش رایگان)'),
    tag: t('Client site', 'سایت مشتری'),
    color: '#b45309',
    link: 'https://profiterol.ir/preview/fikkoprint',
  },
  {
    image: 'mazaheri',
    fa: true,
    title: t('Mazaheri Trading', 'بازرگانی مظاهری'),
    status: t('Client', 'مشتری'),
    kind: t('Customs clearance guide, made with Profiterol', 'راهنمای ترخیص کالا، ساخته‌شده با پروفیترول'),
    note: '',
    tag: t('Client site', 'سایت مشتری'),
    color: '#b45309',
    link: '',
  },
  {
    image: 'parsserver',
    title: t('ParsServer', 'پارس‌سرور'),
    status: t('Ours', 'زیرساخت'),
    kind: t('One server for every project', 'یک سرور برای همه‌ی پروژه‌ها'),
    note: t('(Docker, nginx, PostgreSQL, free SSL)', '(داکر، nginx، PostgreSQL، SSL رایگان)'),
    tag: 'Infrastructure',
    color: '#0b1220',
    link: '',
  },
];
const workImage = (w, l) => `work/${w.image}${w.fa ? `-${l}` : ''}.jpg`;

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

/** Uploads a picture from scripts/profiterol-ir/ once; later runs find it in the media library by its name. */
const existing = await api('GET', '/admin/media').catch(() => []);
const byName = new Map((Array.isArray(existing) ? existing : (existing?.items ?? [])).map((m) => [m.originalName ?? m.name, m.url]));
const uploaded = {};
async function pic(file) {
  if (uploaded[file]) return uploaded[file];
  const name = `profiterol-ir-${file.replace('/', '-')}`;
  if (byName.has(name)) return (uploaded[file] = byName.get(name));
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(DIR + file)], { type: 'image/jpeg' }), name);
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...SITE }, body: fd });
  if (!res.ok) throw new Error(`upload ${file}: ${res.status} ${await res.text()}`);
  return (uploaded[file] = (await res.json()).url);
}

const P = {};
for (const f of [
  ...Object.values(BUSINESS_PHOTOS).map((n) => `photos/${n}.jpg`),
  ...FEATURES.map((g) => g.image),
  'photos/cafe.jpg',
  'photos/laptop-typing.jpg',
  'photos/analytics.jpg',
  'photos/team-talk.jpg',
  'photos/office-highfive.jpg',
  'product/editor-mobile.jpg',
  ...WORK.flatMap((w) => (w.fa ? ['en', 'fa'].map((l) => workImage(w, l)) : [workImage(w, 'en')])),
]) {
  P[f] = await pic(f);
}

// ---------- The page ----------
/** Each feature on its own line, numbered 1…FEATURE_COUNT across the groups, so the page counts them out. */
const firstNumber = FEATURES.map((g, i) => 1 + FEATURES.slice(0, i).reduce((n, x) => n + x.items.length, 0));
const numbered = (l, group, i) =>
  group.items.map((item, j) => `${l === 'fa' ? fa(firstNumber[i] + j) : firstNumber[i] + j}. ${item(l)}`).join('\n');

const blocks = (l) => [
  {
    id: 'hero',
    type: 'aurora-hero',
    props: {
      eyebrow: t('Profiterol website builder', 'سایت‌ساز پروفیترول')(l),
      title: t('A professional website for your', 'یک وب‌سایت حرفه‌ای برای')(l),
      words: t(
        'café, clinic, shop, restaurant, salon, company, hotel, school',
        'کافه، مطب، فروشگاه، رستوران، آرایشگاه، شرکت، هتل، آموزشگاه',
      )(l),
      text: t(
        `Any business, any feature: ${FEATURE_COUNT} features, ${N.blocks} blocks and ${N.themes} themes, in Persian and English. See your site as a free preview before you pay.`,
        `هر کسب‌وکاری، با هر امکانی: {${FEATURE_COUNT}} امکان، {${N.blocks}} بلوک و {${N.themes}} تم، به فارسی و انگلیسی. پیش از پرداخت، سایتتان را رایگان ببینید.`,
      )(l),
      buttonLabel: t('Get a free preview', 'پیش‌نمایش رایگان بگیرید')(l),
      buttonLink: '#contact',
      secondButtonLabel: t(`See all ${FEATURE_COUNT} features`, `دیدن هر {${FEATURE_COUNT}} امکان`)(l),
      secondButtonLink: '#features',
      look: 'dark',
    },
  },
  {
    id: 'editor',
    type: 'image-text',
    props: {
      anchor: 'editor',
      animation: 'rise',
      title: t('Change your site like you write a message', 'سایتتان را مثل نوشتن یک پیام تغییر دهید')(l),
      text: t(
        'This is the real Profiterol editor. Click a title and type, drop a photo onto a block, drag sections into place, and check the phone view before you press Publish. No code, no waiting for a developer.',
        'این ویرایشگر واقعی پروفیترول است. روی عنوان کلیک کنید و بنویسید، عکس را روی بلوک بیندازید، بخش‌ها را جابه‌جا کنید و پیش از زدن «انتشار» نمای موبایل را ببینید. بدون کدنویسی و بدون معطلی برای برنامه‌نویس.',
      )(l),
      image: P[l === 'fa' ? 'product/editor-fa.jpg' : 'product/editor.jpg'],
      imageSide: 'end',
      buttonLabel: t('Try it on your own preview', 'روی پیش‌نمایش خودتان امتحان کنید')(l),
      buttonLink: '#contact',
    },
  },
  {
    id: 'numbers',
    type: 'counters',
    props: {
      title: t('Profiterol, counted', 'پروفیترول به عدد')(l),
      items: [
        { value: FEATURE_COUNT, prefix: '', suffix: '', label: t('features', 'امکان')(l) },
        { value: N.blocks, prefix: '', suffix: '', label: t('ready blocks', 'بلوک آماده')(l) },
        { value: N.businessTypes, prefix: '', suffix: '', label: t('business types', 'نوع کسب‌وکار')(l) },
        { value: N.themes, prefix: '', suffix: '', label: t('ready-made themes', 'تم آماده')(l) },
        { value: N.pageTemplates + N.siteTemplates, prefix: '', suffix: '', label: t('page and site templates', 'قالب صفحه و سایت')(l) },
        { value: 2, prefix: '', suffix: '', label: t('languages on every page', 'زبان در هر صفحه')(l) },
      ],
    },
  },
  {
    id: 'business',
    type: 'photo-grid',
    props: {
      anchor: 'business',
      size: '3*4',
      mobileSize: '6*2',
      items: businessCategories.map((c) => ({
        image: P[`photos/${BUSINESS_PHOTOS[c.key]}.jpg`],
        title: l === 'fa' ? c.label.fa : c.label.en,
        text: c.types
          .slice(0, 5)
          .map((x) => (l === 'fa' ? x.label.fa : x.label.en))
          .join(l === 'fa' ? '، ' : ', '),
        link: '#contact',
      })),
    },
  },
  {
    id: 'business-note',
    type: 'statement',
    props: {
      title: t(
        `${N.businessCategories} kinds of business, ${N.businessTypes} business types`,
        `{${N.businessCategories}} گروه کسب‌وکار، {${N.businessTypes}} نوع کسب‌وکار`,
      )(l),
      text: t(
        'Pick yours in Site settings and Google learns what you do, where you are and how to reach you, for search results and maps.',
        'نوع کسب‌وکارتان را در تنظیمات سایت انتخاب کنید تا گوگل بداند چه کاری می‌کنید، کجا هستید و چطور می‌شود با شما تماس گرفت؛ برای نتایج جست‌وجو و نقشه.',
      )(l),
      image: P['photos/shop-checkout.jpg'],
      buttonLabel: '',
    },
  },
  {
    id: 'features',
    type: 'card-grid',
    props: {
      anchor: 'features',
      animation: 'rise',
      title: t(`All ${FEATURE_COUNT} features, counted`, `هر {${FEATURE_COUNT}} امکان، شمرده‌شده`)(l),
      subtitle: t(
        `In ${FEATURES.length} groups. Every site gets all of them: no feature is locked behind a bigger plan.`,
        `در {${FEATURES.length}} گروه. همه‌ی این امکانات در هر سایت هست؛ هیچ امکانی پشت بسته‌ی گران‌تر قفل نشده.`,
      )(l),
      columns: '3',
      // Raised cards show their whole text (photo cards cut it after three lines).
      variant: 'raised',
      items: FEATURES.map((g, i) => ({
        image: P[g.image],
        title: `${g.name(l)} · ${l === 'fa' ? fa(g.items.length) : g.items.length}`,
        text: numbered(l, g, i),
        link: '',
      })),
    },
  },
  {
    id: 'how',
    type: 'sticky-story',
    props: {
      anchor: 'how',
      title: t('From a free preview to your own domain', 'از پیش‌نمایش رایگان تا دامنه‌ی خودتان')(l),
      imageSide: 'start',
      steps: [
        {
          image: P['photos/team-talk.jpg'],
          eyebrow: t('Step 1', 'قدم ۱')(l),
          title: t('Tell us about your business', 'از کسب‌وکارتان بگویید')(l),
          text: t(
            'Fill in the form below: what you do, and what your site needs. A menu, booking, a blog, a portfolio, prices — anything.',
            'فرم پایین صفحه را پر کنید: چه کاری می‌کنید و سایتتان به چه چیزی نیاز دارد. منو، رزرو، وبلاگ، نمونه‌کار، قیمت‌ها؛ هر چیزی.',
          )(l),
        },
        {
          image: P['product/pages.jpg'],
          eyebrow: t('Step 2', 'قدم ۲')(l),
          title: t('Get a preview site', 'یک سایت پیش‌نمایش بگیرید')(l),
          text: t(
            'Your site is built at profiterol.ir/preview/your-name, with its own admin panel. Change anything you like, for free, before you decide.',
            'سایتتان در نشانی profiterol.ir/preview/نام-شما ساخته می‌شود، با پنل مدیریت خودش. پیش از تصمیم، هر چیزی را رایگان تغییر دهید.',
          )(l),
        },
        {
          image: P['product/editor-mobile.jpg'],
          eyebrow: t('Step 3', 'قدم ۳')(l),
          title: t('Make it yours', 'آن را مال خودتان کنید')(l),
          text: t(
            'Your photos, your words, your colors. Check it on a phone, in Persian and in English, and publish when it is ready.',
            'عکس‌های شما، حرف‌های شما، رنگ‌های شما. آن را در موبایل، به فارسی و انگلیسی ببینید و هر وقت آماده بود منتشر کنید.',
          )(l),
        },
        {
          image: P['photos/laptop-typing.jpg'],
          eyebrow: t('Step 4', 'قدم ۴')(l),
          title: t('Go live on your own domain', 'روی دامنه‌ی خودتان آنلاین شوید')(l),
          text: t(
            'Point your domain to us and the preview becomes your real site, with everything you made, free SSL and nightly backups.',
            'دامنه‌تان را به ما وصل کنید تا پیش‌نمایش با هر چه ساخته‌اید سایت اصلی‌تان شود؛ با SSL رایگان و پشتیبان‌گیری شبانه.',
          )(l),
        },
      ],
    },
  },
  {
    id: 'highlights',
    type: 'stacking-cards',
    props: {
      title: t('A few things people ask for first', 'چیزهایی که معمولاً اول می‌پرسند')(l),
      cards: [
        {
          image: P['product/editor-mobile.jpg'],
          eyebrow: t('Phones first', 'اول موبایل')(l),
          title: t('Looks right on every phone', 'در هر گوشی درست دیده می‌شود')(l),
          text: t(
            'Every block rearranges itself for phones and tablets, and you can see each one in the editor before visitors do.',
            'هر بلوک خودش را برای موبایل و تبلت مرتب می‌کند و شما هر کدام را پیش از بازدیدکننده‌ها در ویرایشگر می‌بینید.',
          )(l),
          color: '#0f766e',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: P['photos/analytics.jpg'],
          eyebrow: t('Found on Google', 'دیده‌شدن در گوگل')(l),
          title: t('SEO built in, not added on', 'سئو از اول در سایت هست')(l),
          text: t(
            'Titles, descriptions, sitemap, robots.txt, share pictures, business details for Google and a check that tells you what is missing.',
            'عنوان، توضیح، نقشه‌ی سایت، robots.txt، عکس اشتراک‌گذاری، اطلاعات کسب‌وکار برای گوگل و بررسی‌ای که می‌گوید چه چیزی کم است.',
          )(l),
          color: '#1e3a8a',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: P['product/ai-blocks.jpg'],
          eyebrow: t('Any feature', 'هر امکانی')(l),
          title: t('Need something that is not here?', 'چیزی لازم دارید که در فهرست نیست؟')(l),
          text: t(
            'Describe it and AI builds a new block for your site, or show it a website you like. Approved blocks work like every other block.',
            'توصیفش کنید تا هوش مصنوعی یک بلوک تازه برای سایتتان بسازد، یا سایتی را که دوست دارید نشانش دهید. بلوک تأییدشده مثل بقیه‌ی بلوک‌ها کار می‌کند.',
          )(l),
          color: '#7c2d12',
          buttonLabel: '',
          buttonLink: '',
        },
        {
          image: P['photos/cafe.jpg'],
          eyebrow: t('Persian first', 'فارسی، درست')(l),
          title: t('Right to left, done properly', 'راست‌به‌چپ، همان‌طور که باید')(l),
          text: t(
            'Persian fonts, Persian digits, Persian web addresses and an English version of every page, one click away.',
            'فونت فارسی، اعداد فارسی، نشانی‌های فارسی و نسخه‌ی انگلیسی هر صفحه، با یک کلیک.',
          )(l),
          color: '#3f3f46',
          buttonLabel: '',
          buttonLink: '',
        },
      ],
    },
  },
  {
    id: 'company',
    type: 'hello-statement',
    props: {
      anchor: 'about',
      label: t('(Profiterol, the company)', '(پروفیترول، شرکت)')(l),
      text: t(
        'Profiterol is a software company. We do not just sell websites: we *build and run* real products, from an online shop and a fintech wallet to multiplayer games and the builder you are looking at. _Your site gets the same care._',
        'پروفیترول یک شرکت نرم‌افزاری است. ما فقط سایت نمی‌فروشیم؛ محصول واقعی *می‌سازیم و نگه می‌داریم*، از فروشگاه آنلاین و کیف پول مالی تا بازی‌های گروهی و همین سایت‌سازی که می‌بینید. _سایت شما هم همین دقت را می‌گیرد._',
      )(l),
      look: 'dark',
    },
  },
  {
    id: 'work',
    type: 'work-index',
    props: {
      anchor: 'work',
      label: t('Our work', 'کارهای ما')(l),
      period: t('Built and run by Profiterol', 'ساخت و نگه‌داری پروفیترول')(l),
      projects: WORK.map((w) => ({
        title: w.title(l),
        year: w.status(l),
        kind: w.kind(l),
        note: typeof w.note === 'function' ? w.note(l) : w.note,
        tag: typeof w.tag === 'function' ? w.tag(l) : w.tag,
        image: P[workImage(w, l)],
        color: w.color,
        link: w.link,
      })),
      linkLabel: t('Visit →', 'دیدن ←')(l),
      look: 'dark',
    },
  },
  {
    id: 'founder',
    type: 'statement',
    props: {
      anchor: 'founder',
      title: `${FOUNDER.name(l)} · ${FOUNDER.role(l)}`,
      text: FOUNDER.background(l),
      image: P['photos/laptop-typing.jpg'],
      buttonLabel: t('See his LinkedIn profile', 'پروفایل لینکدین')(l),
      buttonLink: FOUNDER.linkedin,
    },
  },
  {
    id: 'preview',
    type: 'spinning-badge',
    props: {
      eyebrow: t('Free preview', 'پیش‌نمایش رایگان')(l),
      title: t('See your website before you pay for it', 'سایتتان را پیش از پرداخت ببینید')(l),
      text: t(
        'We build a preview of your site on profiterol.ir with its own admin panel. Use it, change it, show it to your partners. If you like it, it moves to your domain with everything in it.',
        'یک پیش‌نمایش از سایتتان روی profiterol.ir با پنل مدیریت خودش می‌سازیم. از آن استفاده کنید، تغییرش دهید و به همکارانتان نشانش دهید. اگر پسندیدید، با همه‌ی محتوایش به دامنه‌ی شما منتقل می‌شود.',
      )(l),
      buttonLabel: t('Ask for a preview', 'درخواست پیش‌نمایش')(l),
      buttonLink: '#contact',
      // Latin in both languages: the badge sets each letter on the circle by itself, which would pull Persian letters apart.
      badgeText: 'profiterol.ir · free preview · any business · ',
      image: P['photos/office-highfive.jpg'],
      icon: 'mdi-rocket-launch-outline',
      badgeSide: 'end',
    },
  },
  {
    id: 'faq',
    type: 'faq',
    props: {
      anchor: 'faq',
      title: t('Questions', 'پرسش‌ها')(l),
      subtitle: '',
      items: [
        [
          t('Is Profiterol right for my kind of business?', 'پروفیترول به درد کسب‌وکار من می‌خورد؟'),
          t(
            `Almost certainly. It knows ${N.businessTypes} business types in ${N.businessCategories} groups, from cafés and clinics to law firms, hotels and schools, and every block can be used for any of them.`,
            `به احتمال زیاد بله. پروفیترول {${N.businessTypes}} نوع کسب‌وکار را در {${N.businessCategories}} گروه می‌شناسد، از کافه و مطب تا دفتر وکالت، هتل و آموزشگاه، و هر بلوک برای همه‌ی آن‌ها قابل استفاده است.`,
          ),
        ],
        [
          t('Do I need to know code?', 'باید برنامه‌نویسی بلد باشم؟'),
          t(
            'No. You click and type on the page itself. Custom CSS and HTML are there for those who want them, never required.',
            'نه. روی خود صفحه کلیک می‌کنید و می‌نویسید. CSS و HTML دلخواه برای کسانی هست که بخواهند، ولی لازم نیست.',
          ),
        ],
        [
          t('What if I need a feature that is not on the list?', 'اگر امکانی بخواهم که در فهرست نیست چه؟'),
          t(
            'Tell us. Many requests are a new block, which the AI block builder can make for your site; for bigger ones we talk it through with you.',
            'بگویید. بسیاری از درخواست‌ها یک بلوک تازه است که سازنده‌ی بلوک با هوش مصنوعی برای سایتتان می‌سازد؛ برای کارهای بزرگ‌تر با شما گفت‌وگو می‌کنیم.',
          ),
        ],
        [
          t('Can I use my own domain?', 'می‌توانم دامنه‌ی خودم را داشته باشم؟'),
          t(
            'Yes, with free SSL (the padlock in the address bar). Your www address works too.',
            'بله، با SSL رایگان (قفل کنار نشانی). نشانی با www هم کار می‌کند.',
          ),
        ],
        [
          t('Is my site backed up?', 'از سایتم پشتیبان گرفته می‌شود؟'),
          t(
            'Every night: your pages, photos and messages. Every page also keeps its last 50 versions, so a mistake is one click from undone.',
            'هر شب: صفحه‌ها، عکس‌ها و پیام‌ها. هر صفحه هم ۵۰ نسخه‌ی آخرش را نگه می‌دارد، پس هر اشتباه با یک کلیک برمی‌گردد.',
          ),
        ],
        [
          t('Who is behind Profiterol?', 'چه کسی پشت پروفیترول است؟'),
          t(
            `Profiterol is a software company founded by Hesam Tamjidi. The same team builds and runs Petshop Bahar, Packeta, Dunga and GIMOO on its own servers, so your site is in hands that keep real products online every day.`,
            `پروفیترول یک شرکت نرم‌افزاری است که حسام تمجیدی آن را بنیان گذاشته. همین تیم پت‌شاپ بهار، پکتا، دونگا و گیمو را روی سرورهای خودش می‌سازد و نگه می‌دارد؛ پس سایت شما دست کسانی است که هر روز محصول واقعی را آنلاین نگه می‌دارند.`,
          ),
        ],
        [
          t('Can several people edit the site?', 'چند نفر می‌توانند سایت را ویرایش کنند؟'),
          t(
            'Yes. Invite them as admins or editors; each has their own sign-in.',
            'بله. آن‌ها را به‌عنوان مدیر یا ویرایشگر دعوت کنید؛ هر کدام ورود خودش را دارد.',
          ),
        ],
      ].map(([q, a]) => ({ q: q(l), a: a(l) })),
    },
  },
  {
    id: 'contact',
    type: 'contact-form',
    props: {
      anchor: 'contact',
      title: t('Ask for your free preview', 'پیش‌نمایش رایگانتان را بخواهید')(l),
      text: t(
        'Tell us what you do and what your site needs. We answer within one working day.',
        'بگویید چه کاری می‌کنید و سایتتان به چه چیزی نیاز دارد. ظرف یک روز کاری پاسخ می‌دهیم.',
      )(l),
      fields: [
        { label: t('Your name', 'نام شما')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Phone', 'شماره تماس')(l), type: 'tel', required: true, options: '', placeholder: '09…' },
        { label: t('Email', 'ایمیل')(l), type: 'email', required: false, options: '', placeholder: '' },
        {
          label: t('Your business', 'کسب‌وکار شما')(l),
          type: 'select',
          required: true,
          options: businessCategories.map((c) => (l === 'fa' ? c.label.fa : c.label.en)).join(','),
          placeholder: '',
        },
        {
          label: t('What should your site do?', 'سایتتان چه کارهایی باید بکند؟')(l),
          type: 'textarea',
          required: false,
          options: '',
          placeholder: t('A menu, booking, a blog, a portfolio…', 'منو، رزرو، وبلاگ، نمونه‌کار…')(l),
        },
      ],
      submitLabel: t('Send', 'ارسال')(l),
      successMessage: t('Thank you! We will be in touch within one working day.', 'ممنون! ظرف یک روز کاری با شما تماس می‌گیریم.')(l),
    },
  },
  {
    id: 'footer',
    type: 'contact-footer',
    props: {
      title: t('Profiterol', 'پروفیترول')(l),
      text: t(
        'A website for any business, with any feature it needs. Profiterol is a software company founded by Hesam Tamjidi.',
        'وب‌سایت برای هر کسب‌وکار، با هر امکانی که لازم دارد. پروفیترول یک شرکت نرم‌افزاری به بنیان‌گذاری حسام تمجیدی است.',
      )(l),
      email: CONTACT_EMAIL,
      phone: CONTACT_PHONE,
      address: '',
      copyright: t('© Profiterol', '© پروفیترول')(l),
    },
  },
];

// ---------- Save ----------
const theme = {
  primary: '#0d9488',
  secondary: '#f59e0b',
  dark: '#0b1220',
  background: '#0b1220',
  headerStyle: 'glass',
  cursor: 'default',
  pageTransition: 'fade',
};
const titles = {
  en: 'Profiterol — a website for any business',
  fa: 'پروفیترول؛ وب‌سایت برای هر کسب‌وکار',
};
const seo = {
  en: {
    seoTitle: 'Website builder for any business, in Persian and English | Profiterol',
    seoDescription: `A professional website for any business, with ${FEATURE_COUNT} features, ${N.blocks} blocks and ${N.themes} themes, in Persian and English. Free preview before you pay.`,
  },
  fa: {
    seoTitle: 'ساخت سایت برای هر کسب‌وکار، فارسی و انگلیسی | پروفیترول',
    seoDescription: `وب‌سایت حرفه‌ای برای هر کسب‌وکار با ${fa(FEATURE_COUNT)} امکان، ${fa(N.blocks)} بلوک و ${fa(N.themes)} تم، به فارسی و انگلیسی. پیش‌نمایش رایگان پیش از پرداخت.`,
  },
};
const LOCALES = ['en', 'fa'];
const pages = await api('GET', '/admin/pages');
let page;
let slugs;

if (HOME) {
  // A site added without the demo pages has no home page yet.
  page = pages.find((p) => p.isHome) ?? (await api('POST', '/admin/pages', { name: 'Home', isHome: true }));
  slugs = Object.fromEntries(LOCALES.map((l) => [l, page.translations.find((x) => x.locale === l)?.slug ?? '']));
  const settings = await api('GET', '/admin/settings');
  await api('PUT', '/admin/settings', {
    siteName: { fa: 'پروفیترول', en: 'Profiterol' },
    logo: settings.logo,
    favicon: settings.favicon,
    theme: { ...settings.theme, ...theme },
    menu: [
      { href: '#features', label: { fa: 'امکانات', en: 'Features' } },
      { href: '#business', label: { fa: 'کسب‌وکارها', en: 'Businesses' } },
      { href: '#how', label: { fa: 'چطور کار می‌کند', en: 'How it works' } },
      { href: '#work', label: { fa: 'کارهای ما', en: 'Our work' } },
      { href: '#about', label: { fa: 'درباره‌ی ما', en: 'About' } },
      { href: '#faq', label: { fa: 'پرسش‌ها', en: 'FAQ' } },
      { href: '#contact', label: { fa: 'پیش‌نمایش رایگان', en: 'Free preview' } },
    ],
    fonts: settings.fonts,
    savedThemes: settings.savedThemes,
    loader: settings.loader,
    maintenance: settings.maintenance,
    maintenanceText: settings.maintenanceText,
    business: {
      ...settings.business,
      ...(CONTACT_EMAIL ? { email: CONTACT_EMAIL } : {}),
      ...(CONTACT_PHONE ? { phone: CONTACT_PHONE } : {}),
      country: 'IR',
    },
    notifyEmail: settings.notifyEmail,
  });
} else {
  const NAME = 'profiterol.ir';
  page = pages.find((p) => p.name === NAME) ?? (await api('POST', '/admin/pages', { name: NAME }));
  slugs = { en: 'website-builder', fa: 'ساخت-سایت' };
}

await api('PATCH', `/admin/pages/${page.id}`, {
  name: page.name,
  // On its own page the colors belong to the page; with --home they are the site's.
  theme: HOME ? null : theme,
  translations: LOCALES.map((l) => ({ locale: l, slug: slugs[l], title: titles[l], ...seo[l], blocks: blocks(l) })),
});
await api('POST', `/admin/pages/${page.id}/publish`);
console.log(`${FEATURE_COUNT} features in ${FEATURES.length} groups, ${N.blocks} blocks, ${N.businessTypes} business types`);
console.log(`Published: ${LOCALES.map((l) => `/${l}/${slugs[l]}`).join('  ')}`);
