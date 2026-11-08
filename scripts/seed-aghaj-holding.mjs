/**
 * Builds the Aghaj Investment Holding site (هلدینگ سرمایه‌گذاری آغاج) in Persian and English: a Tehran investment
 * company that helps people invest in real estate and in importing basic goods (frozen meat from Brazil and other
 * countries, sugar, rice…), with business consulting as its key strength. Gostaresh Protein Setareh Shargh, its frozen
 * meat importer, has a site of its own (seed-setareh-shargh.mjs) and the two link to each other.
 *
 * The page uses the classic blocks (a full-screen photo slider, three photo links, a photo beside text that opens on
 * hover, a photo with a sentence over it, contact beside a photo) and the Folio ones (a sentence lighting up word by
 * word, a word ticker, a numbered list of the places worth investing in with a sticky photo, a strip of photos that
 * moves sideways, numbered service cells and a "let's talk" footer), in deep green.
 *
 * The photos are real, freely licensed pictures from Wikimedia Commons kept in scripts/aghaj-holding/ (fetched with
 * fetch-commons-photos.mjs), each credited on a "Photo credits" page. They show Tehran, Kish, the Caspian coast and
 * the trade in general, not Aghaj's own projects, offices or people.
 *
 *   node scripts/seed-aghaj-holding.mjs           a separate page at /fa/هلدینگ-آغاج and /en/aghaj-holding
 *   node scripts/seed-aghaj-holding.mjs --home    fills the home page and sets the site name, logo, menu and colors
 *   PREVIEW=aghaj node scripts/seed-aghaj-holding.mjs
 *                                                 the preview site <PREVIEW_URL>/preview/aghaj, filled as with --home
 *
 * Also: CONTACT_EMAIL, CONTACT_PHONE (shown in the contact block, the footer and the business details when given) and
 * PROTEIN_URL (the Setareh Shargh site; on a preview it defaults to <PREVIEW_URL>/preview/setareh-shargh/). See
 * preview-seed-lib.mjs for the connection settings and DEPLOY.md, "Aghaj Holding and Setareh Shargh", for running it.
 */
import { fileURLToPath } from 'node:url';
import { connect, creditBlocks, faDigits, loadSharp, ownLogo, publishPage, t, uploadPhotos } from './preview-seed-lib.mjs';

const ctx = await connect({
  name: 'Aghaj Holding',
  prospect:
    'Aghaj Investment Holding (Tehran): real estate, basic-goods imports and business consulting. Filled by scripts/seed-aghaj-holding.mjs.',
});
const { url: img, credits } = await uploadPhotos(
  ctx,
  fileURLToPath(new URL('./aghaj-holding', import.meta.url)),
  'Aghaj Holding · Commons photos',
);
console.log(`Photos: ${credits.length}`);

const EMAIL = process.env.CONTACT_EMAIL ?? '';
const PHONE = process.env.CONTACT_PHONE ?? '';
const proteinBase = process.env.PROTEIN_URL ?? (ctx.preview ? `${ctx.previewUrl}/preview/setareh-shargh/` : '');
const protein = (l) => (proteinBase ? `${proteinBase.replace(/\/?$/, '/')}${l}` : '#group');
const phone = (l) => (l === 'fa' ? faDigits(PHONE) : PHONE);

/** The green of the company's logo, and a deeper one for buttons and links, so white text on it stays readable. */
const LOGO_GREEN = '#14c05f';
const GREEN = '#0f9a4f';
const DIR = fileURLToPath(new URL('./aghaj-holding', import.meta.url));

/**
 * The logo: the company's own file in scripts/aghaj-holding/ (logo.svg, logo.png or logo.webp) when it is there.
 * Otherwise a stand-in drawn like it: a round crown of leaves on branches, a trunk and spreading roots, in the logo's
 * green, on a transparent background (the glass header turns it white over the photos).
 */
async function logo() {
  const own = await ownLogo(DIR);
  if (own) return own;
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  // Branches leave the top of the trunk, bend outwards and split into two twigs each.
  const branches = [-66, -44, -22, 0, 22, 44, 66]
    .map((deg) => {
      const a = ((deg - 90) * Math.PI) / 180;
      const [mx, my] = [250 + Math.cos(a) * 85, 262 + Math.sin(a) * 95];
      const [x, y] = [250 + Math.cos(a) * 165, 250 + Math.sin(a) * 160];
      const twigs = [-0.45, 0.45]
        .map(
          (d) =>
            `<path d="M ${mx} ${my} Q ${(mx + x) / 2 + Math.cos(a + d) * 30} ${(my + y) / 2 + Math.sin(a + d) * 30} ${250 + Math.cos(a + d * 0.6) * 175} ${250 + Math.sin(a + d * 0.6) * 165}" stroke-width="3.5"/>`,
        )
        .join('');
      return `<path d="M 250 280 Q ${250 + Math.cos(a) * 30} ${255 + Math.sin(a) * 60} ${x} ${y}" stroke-width="${deg === 0 ? 11 : 7}"/>${twigs}`;
    })
    .join('');
  const leaves = [];
  while (leaves.length < 300) {
    const x = 40 + rnd() * 420;
    const y = 20 + rnd() * 300;
    const dx = (x - 250) / 210;
    const dy = (y - 175) / 155;
    if (dx * dx + dy * dy > 1 || (y > 255 && Math.abs(x - 250) < 40)) continue;
    leaves.push(
      `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="12" ry="6" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`,
    );
  }
  const roots = [-150, -110, -70, -35, 0, 35, 70, 110, 150]
    .map(
      (dx, i) =>
        `<path d="M 250 385 C ${250 + dx * 0.3} ${400 + (i % 3) * 6}, ${250 + dx * 0.8} ${410 + (i % 2) * 20}, ${250 + dx} ${440 + (i % 4) * 12}" stroke-width="${i % 2 ? 4 : 6}"/>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
    <g fill="${LOGO_GREEN}">${leaves.join('')}<path d="M 232 395 C 238 340, 238 300, 240 255 L 260 255 C 262 300, 262 340, 268 395 Z"/></g>
    <g fill="none" stroke="${LOGO_GREEN}" stroke-linecap="round">${branches}${roots}</g></svg>`;
  return { bytes: await loadSharp()(Buffer.from(svg)).png().toBuffer(), name: 'aghaj-logo-tree.png', type: 'image/png' };
}

/**
 * The places worth a look for a property investment, each with why investors go there. Kept general and without
 * prices, which change every month: the advisor gives the numbers of a real property.
 */
const PLACES = [
  {
    image: 'chitgar',
    title: t('Chitgar · District 22', 'چیتگر · منطقه‌ی ۲۲'),
    where: t('West Tehran', 'غرب تهران'),
    why: t(
      'New towers around Chitgar Lake, with parks, highways and the metro. Still growing, and cheaper per metre than the north.',
      'برج‌های تازه گرداگرد دریاچه‌ی چیتگر، با پارک، بزرگراه و مترو. هنوز در حال رشد و با قیمت هر متر کمتر از شمال شهر.',
    ),
    note: t('(Growth · new apartments)', '(رشد · آپارتمان نوساز)'),
    tag: t('Residential', 'مسکونی'),
    color: '#1f7a4d',
  },
  {
    image: 'zafaraniyeh',
    title: t('Elahieh & Zafaraniyeh', 'الهیه و زعفرانیه'),
    where: t('North Tehran', 'شمال تهران'),
    why: t(
      'The most sought-after streets of the capital, at the foot of the mountains. Prices hold best here in hard years, and good flats always find tenants.',
      'خواستنی‌ترین خیابان‌های پایتخت در دامنه‌ی کوه. قیمت در سال‌های سخت این‌جا بهتر از همه‌جا حفظ می‌شود و آپارتمان خوب همیشه مستأجر دارد.',
    ),
    note: t('(Keeps value · high-end rent)', '(حفظ ارزش · اجاره‌ی لوکس)'),
    tag: t('Residential', 'مسکونی'),
    color: '#2f5d46',
  },
  {
    image: 'mall',
    title: t('West Tehran shops and offices', 'تجاری و اداری غرب تهران'),
    where: t('Around the big commercial complexes', 'اطراف مجتمع‌های تجاری بزرگ'),
    why: t(
      'Shops and offices in busy complexes along the western highways. Rent is the point here, not a quick resale.',
      'مغازه و دفتر در مجتمع‌های پررفت‌وآمد کنار بزرگراه‌های غرب تهران. این‌جا هدف، اجاره‌ی پایدار است نه فروش سریع.',
    ),
    note: t('(Monthly rent)', '(اجاره‌ی ماهانه)'),
    tag: t('Commercial', 'تجاری'),
    color: '#46604f',
  },
  {
    image: 'pardis',
    title: t('Pardis', 'پردیس'),
    where: t('New town, east of Tehran', 'شهر جدید، شرق تهران'),
    why: t(
      'A new town beside a technology park, with whole districts being built. The lowest entry price on this list, for those who can wait.',
      'شهری جدید کنار پارک فناوری، با محله‌هایی که یکجا ساخته می‌شوند. کمترین سرمایه‌ی ورود در این فهرست، برای کسانی که می‌توانند صبر کنند.',
    ),
    note: t('(Low entry · pre-sale)', '(ورود ارزان · پیش‌خرید)'),
    tag: t('Residential', 'مسکونی'),
    color: '#5b6f45',
  },
  {
    image: 'kish',
    title: t('Kish Island', 'جزیره‌ی کیش'),
    where: t('Free zone, Persian Gulf', 'منطقه‌ی آزاد، خلیج فارس'),
    why: t(
      'A free trade zone and Iran’s favourite holiday island. Hotel apartments and short stays rent well all through the cool season.',
      'منطقه‌ی آزاد تجاری و محبوب‌ترین جزیره‌ی تفریحی ایران. هتل‌آپارتمان و اجاره‌ی کوتاه‌مدت در تمام فصل خنک سال خوب اجاره می‌رود.',
    ),
    note: t('(Free zone · holiday rent)', '(منطقه‌ی آزاد · اجاره‌ی گردشگری)'),
    tag: t('Tourism', 'گردشگری'),
    color: '#1d6f7a',
  },
  {
    image: 'ramsar',
    title: t('The Caspian coast', 'کرانه‌ی خزر'),
    where: t('Ramsar, Nowshahr, Chalus', 'رامسر، نوشهر، چالوس'),
    why: t(
      'Villas and second homes between the forest and the sea, a few hours from Tehran. Busy every holiday, and a home for the family too.',
      'ویلا و خانه‌ی دوم میان جنگل و دریا، چند ساعت از تهران. هر تعطیلات پر است و برای خانواده هم یک خانه است.',
    ),
    note: t('(Villas · seasonal rent)', '(ویلا · اجاره‌ی فصلی)'),
    tag: t('Villa', 'ویلا'),
    color: '#3f7a3a',
  },
];

const blocks = (l) => [
  {
    id: 'hero',
    type: 'slider',
    props: {
      slides: [
        [
          img.hero,
          t('Aghaj Holding · invest with people who know the market', 'هلدینگ آغاج · سرمایه‌گذاری با کسانی که بازار را می‌شناسند'),
          t('Book a consultation', 'رزرو جلسه‌ی مشاوره'),
          '#contact',
        ],
        [img.chitgar, t('Real estate in the right places', 'ملک در جای درست'), t('Where to invest', 'کجا سرمایه‌گذاری کنیم'), '#places'],
        [
          img.port,
          t('Imports of basic goods, from Brazil to Iran', 'واردات کالاهای اساسی، از برزیل تا ایران'),
          t('What we import', 'آنچه وارد می‌کنیم'),
          '#imports',
        ],
        [
          img.meeting,
          t('Consulting: our key strength', 'مشاوره: قدرت اصلی ما'),
          t('Talk to an advisor', 'گفت‌وگو با مشاور'),
          '#consulting',
        ],
      ].map(([image, title, buttonLabel, buttonLink]) => ({
        image,
        mobileImage: '',
        title: title(l),
        buttonLabel: buttonLabel(l),
        buttonLink,
      })),
      autoplay: true,
      seconds: 6,
    },
  },
  {
    id: 'hello',
    type: 'hello-statement',
    props: {
      label: t('(Aghaj Investment Holding)', '(هلدینگ سرمایه‌گذاری آغاج)')(l),
      text: t(
        'We help people put their capital into _real estate_ and into importing _basic goods._ Before any money moves, we sit down and advise. *Consulting is our key power.*',
        'کمک می‌کنیم سرمایه‌تان را در _املاک_ و واردات _کالاهای اساسی_ به کار بیندازید. پیش از جابه‌جا شدن هر ریالی، می‌نشینیم و مشاوره می‌دهیم. *مشاوره قدرت اصلی ماست.*',
      )(l),
      look: 'light',
    },
  },
  {
    id: 'lines',
    type: 'triple',
    props: {
      anchor: 'what-we-do',
      title: t('Three ways your capital can work', 'سه راه برای به کار انداختن سرمایه')(l),
      items: [
        [
          img.towers,
          t('Real estate', 'املاک'),
          t('Residential, commercial and holiday property in places we know.', 'ملک مسکونی، تجاری و تفریحی در جاهایی که می‌شناسیم.'),
          '#places',
        ],
        [
          img.port,
          t('Basic goods', 'کالاهای اساسی'),
          t('A share in shipments of frozen meat, sugar and rice.', 'سهم در محموله‌های گوشت منجمد، شکر و برنج.'),
          '#imports',
        ],
        [
          img.table,
          t('Consulting', 'مشاوره'),
          t('A plan, a feasibility study or a second opinion.', 'برنامه، طرح توجیهی یا نظر دوم.'),
          '#consulting',
        ],
      ].map(([image, title, text, link]) => ({ image, mobileImage: '', title: title(l), text: text(l), link })),
    },
  },
  {
    id: 'places',
    type: 'work-index',
    props: {
      anchor: 'places',
      label: t('Where to invest in property', 'کجا در ملک سرمایه‌گذاری کنیم')(l),
      period: t('Our picks for 2026', 'پیشنهادهای ما برای ۱۴۰۵')(l),
      projects: PLACES.map((p) => ({
        title: p.title(l),
        year: p.where(l),
        kind: p.why(l),
        note: p.note(l),
        tag: p.tag(l),
        image: img[p.image],
        color: p.color,
        link: '#contact',
      })),
      linkLabel: t('Ask about this area →', 'درباره‌ی این منطقه بپرسید ←')(l),
      look: 'dark',
    },
  },
  {
    id: 'places-ticker',
    type: 'word-ticker',
    props: {
      words: t(
        ['Chitgar', 'Elahieh', 'Zafaraniyeh', 'Pardis', 'Kish', 'Ramsar', 'Nowshahr', 'Chalus'],
        ['چیتگر', 'الهیه', 'زعفرانیه', 'پردیس', 'کیش', 'رامسر', 'نوشهر', 'چالوس'],
      )(l).map((text) => ({ text })),
      speed: 'slow',
      look: 'light',
    },
  },
  {
    id: 'consulting',
    type: 'side-by-side',
    props: {
      anchor: 'consulting',
      image: img.meeting,
      mobileImage: '',
      imageSide: 'right',
      bigTitle: t('No.1', '۱')(l),
      smallTitle: t('Key\nstrength', 'قدرت\nاصلی')(l),
      lines: [
        t(
          'Every client starts with a conversation, not a contract: your capital, your time and the risk you can live with.',
          'هر مشتری با یک گفت‌وگو شروع می‌کند، نه با قرارداد: سرمایه، زمان و ریسکی که می‌پذیرید.',
        ),
        t(
          'Then we tell you plainly which path fits — a flat in Chitgar, a share in a shipment, or nothing yet.',
          'بعد صریح می‌گوییم کدام مسیر به کارتان می‌آید؛ آپارتمانی در چیتگر، سهمی در یک محموله، یا فعلاً هیچ‌کدام.',
        ),
        t(
          'Business owners come to us too, for a plan to grow, a feasibility study or a check on a deal someone offered them.',
          'صاحبان کسب‌وکار هم برای برنامه‌ی رشد، طرح توجیهی یا بررسی معامله‌ای که پیشنهاد شده سراغ ما می‌آیند.',
        ),
      ].map((text) => ({ text: text(l) })),
      buttonLabel: t('Book a consultation', 'رزرو جلسه‌ی مشاوره')(l),
      buttonLink: '#contact',
    },
  },
  {
    id: 'imports',
    type: 'close-up-strip',
    props: {
      anchor: 'imports',
      label: t('(Importing basic goods)', '(واردات کالاهای اساسی)')(l),
      hint: t('Drag or scroll', 'بکشید یا اسکرول کنید')(l),
      items: [
        [img.cattle, t('(01) Beef from Brazil', '(۰۱) گوشت گوساله‌ی برزیل'), t('Frozen meat', 'گوشت منجمد'), '#2f5d46'],
        [img.beef, t('(02) Halal, frozen at source', '(۰۲) حلال، منجمد در مبدأ'), t('Frozen meat', 'گوشت منجمد'), '#7a2f2f'],
        [img.port, t('(03) Through Bandar Abbas', '(۰۳) از بندرعباس'), t('Shipping', 'حمل'), '#1d4f6e'],
        [img.sugar, t('(04) Sugar in bulk', '(۰۴) شکر عمده'), t('Basic goods', 'کالای اساسی'), '#8a7a52'],
        [img.rice, t('(05) Rice', '(۰۵) برنج'), t('Basic goods', 'کالای اساسی'), '#3f7a3a'],
        [img.warehouse, t('(06) Stored until sold', '(۰۶) انبار تا زمان فروش'), t('Storage', 'انبار'), '#46604f'],
      ].map(([image, caption, tag, color]) => ({ image, caption: caption(l), tag: tag(l), color })),
      look: 'dark',
    },
  },
  {
    id: 'statement',
    type: 'horizon',
    props: {
      image: img.bazaarTrade,
      mobileImage: '',
      title: t('From a farm in Brazil to a market in Tehran', 'از مزرعه‌ای در برزیل تا بازاری در تهران')(l),
      text: t(
        'Investors take a share of a shipment. We handle the order registration, payment, shipping, customs and cold storage, and report until the goods are sold.',
        'سرمایه‌گذاران در یک محموله سهم می‌گیرند. ثبت سفارش، پرداخت، حمل، ترخیص و سردخانه با ماست و تا فروش کالا گزارش می‌دهیم.',
      )(l),
      blur: false,
    },
  },
  {
    id: 'steps',
    type: 'service-grid',
    props: {
      anchor: 'steps',
      label: t('How investing with Aghaj works', 'سرمایه‌گذاری با آغاج چطور پیش می‌رود')(l),
      linkLabel: t('Book a consultation →', 'رزرو جلسه‌ی مشاوره ←')(l),
      link: '#contact',
      services: [
        [
          t('A first meeting', 'جلسه‌ی اول'),
          t('Free and without obligation: your goals, budget and questions.', 'رایگان و بدون تعهد: هدف‌ها، بودجه و پرسش‌های شما.'),
        ],
        [
          t('A written proposal', 'پیشنهاد مکتوب'),
          t('The options that fit you, with numbers, risks and a timetable.', 'گزینه‌های متناسب با شما، با ارقام، ریسک‌ها و زمان‌بندی.'),
        ],
        [
          t('A clear contract', 'قرارداد روشن'),
          t('Who puts in what, who owns what, and when you get it back.', 'چه کسی چه می‌گذارد، مالک چیست و سرمایه کی برمی‌گردد.'),
        ],
        [
          t('Reports to the end', 'گزارش تا پایان'),
          t('Photos and documents until the property is delivered or the goods sold.', 'عکس و مدرک تا تحویل ملک یا فروش کالا.'),
        ],
      ].map(([title, text]) => ({ title: title(l), text: text(l), link: '#contact' })),
      look: 'light',
    },
  },
  {
    id: 'group',
    type: 'side-by-side',
    props: {
      anchor: 'group',
      image: img.cattle,
      mobileImage: '',
      imageSide: 'left',
      bigTitle: t('−18°', '۱۸-°')(l),
      smallTitle: t('Group\ncompany', 'شرکت\nگروه')(l),
      lines: [
        t(
          'Gostaresh Protein Setareh Shargh, our meat importer, brings frozen beef, lamb and chicken from Brazil and other countries to Iran.',
          'گسترش پروتئین ستاره شرق، شرکت واردکننده‌ی گوشت ما، گوشت منجمد گوساله، گوسفند و مرغ را از برزیل و کشورهای دیگر به ایران می‌آورد.',
        ),
        t('It keeps the meat at −18 °C from the ship to the store.', 'گوشت را از کشتی تا فروشگاه در دمای ۱۸- درجه نگه می‌دارد.'),
        t(
          'It is managed by Aghaj Holding, and investors can take part in its shipments through us.',
          'مدیریت آن با هلدینگ آغاج است و سرمایه‌گذاران می‌توانند از طریق ما در محموله‌هایش شریک شوند.',
        ),
      ].map((text) => ({ text: text(l) })),
      buttonLabel: t('Visit Gostaresh Protein', 'رفتن به سایت گسترش پروتئین')(l),
      buttonLink: protein(l),
    },
  },
  {
    id: 'faq',
    type: 'faq',
    props: {
      anchor: 'faq',
      title: t('Questions before the first meeting', 'پرسش‌های پیش از جلسه‌ی اول')(l),
      subtitle: '',
      items: [
        [
          t('Is the first consultation free?', 'جلسه‌ی اول مشاوره رایگان است؟'),
          t('Yes. The first meeting is free and commits you to nothing.', 'بله. جلسه‌ی اول رایگان است و هیچ تعهدی برای شما ندارد.'),
        ],
        [
          t('Which area is best for me?', 'کدام منطقه برای من بهتر است؟'),
          t(
            'It depends on what you want: value that holds (north Tehran), growth (Chitgar, Pardis), monthly rent (commercial units) or holiday rent (Kish, the Caspian coast). We help you choose, then check the building itself.',
            'به هدفتان بستگی دارد: حفظ ارزش (شمال تهران)، رشد (چیتگر، پردیس)، اجاره‌ی ماهانه (واحد تجاری) یا اجاره‌ی گردشگری (کیش، شمال کشور). کمک می‌کنیم انتخاب کنید و بعد خود ساختمان را بررسی می‌کنیم.',
          ),
        ],
        [
          t('How much do I need to start?', 'برای شروع چقدر سرمایه لازم است؟'),
          t(
            'A share in an import shipment or a building partnership can start lower than buying a whole flat. Tell us your budget and we will tell you what is realistic.',
            'سهم در یک محموله‌ی وارداتی یا مشارکت در ساخت می‌تواند با سرمایه‌ای کمتر از خرید یک آپارتمان کامل شروع شود. بودجه‌تان را بگویید تا بگوییم چه چیزی واقع‌بینانه است.',
          ),
        ],
        [
          t('Do you promise a fixed return?', 'سود ثابت تضمین می‌کنید؟'),
          t(
            'No honest investor can. We show you the numbers of similar deals and the risks, and write down how profit and loss are shared.',
            'هیچ سرمایه‌گذار صادقی نمی‌تواند. ارقام معامله‌های مشابه و ریسک‌ها را نشان می‌دهیم و می‌نویسیم سود و زیان چطور تقسیم می‌شود.',
          ),
        ],
        [
          t('Who checks the documents of a property?', 'مدارک ملک را چه کسی بررسی می‌کند؟'),
          t(
            'Our own lawyers check the deed, the permits and the contract before you sign.',
            'وکلای خود ما پیش از امضا، سند، پروانه‌ها و قرارداد را بررسی می‌کنند.',
          ),
        ],
      ].map(([q, a]) => ({ q: q(l), a: a(l) })),
    },
  },
  {
    id: 'contact',
    type: 'contact-split',
    props: {
      anchor: 'contact',
      image: img.residential,
      title: t('Book a consultation', 'رزرو جلسه‌ی مشاوره')(l),
      text: t(
        'Tell us a little about what you have in mind. An advisor will call you within one working day.',
        'کمی از برنامه‌تان بگویید. ظرف یک روز کاری یکی از مشاوران با شما تماس می‌گیرد.',
      )(l),
      address: t('Tehran, Iran', 'تهران، ایران')(l),
      email: EMAIL,
      phone: phone(l),
      fields: [
        { label: t('Name', 'نام و نام خانوادگی')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Mobile', 'تلفن همراه')(l), type: 'tel', required: true, options: '', placeholder: t('09…', '۰۹…')(l) },
        {
          label: t('Interested in', 'زمینه‌ی مورد نظر')(l),
          type: 'select',
          required: true,
          options: t(
            'Real estate in Tehran, Kish or the Caspian coast, Importing basic goods, Business consulting, Not sure yet',
            'ملک در تهران، کیش یا شمال, واردات کالاهای اساسی, مشاوره‌ی کسب‌وکار, هنوز نمی‌دانم',
          )(l),
          placeholder: '',
        },
        {
          label: t('Budget (optional)', 'بودجه (اختیاری)')(l),
          type: 'text',
          required: false,
          options: '',
          placeholder: t('e.g. 5 billion rials', 'مثلاً ۵ میلیارد ریال')(l),
        },
        { label: t('Your message', 'توضیحات')(l), type: 'textarea', required: false, options: '', placeholder: '' },
      ],
      submitLabel: t('Send', 'ارسال')(l),
      successMessage: t(
        'Thank you. An advisor will call you within one working day.',
        'ممنون. ظرف یک روز کاری یکی از مشاوران با شما تماس می‌گیرد.',
      )(l),
    },
  },
  {
    id: 'footer',
    type: 'talk-footer',
    props: {
      label: t('Have capital, or a plan?', 'سرمایه یا برنامه‌ای دارید؟')(l),
      title: t("LET'S TALK", 'گفت‌وگو کنیم')(l),
      link: '#contact',
      email: EMAIL,
      social: [
        { label: t('Gostaresh Protein', 'گسترش پروتئین')(l), link: protein(l) },
        { label: t('Photo credits', 'اعتبار عکس‌ها')(l), link: t('photo-credits', 'اعتبار-عکس‌ها')(l) },
      ],
      city: t('Tehran', 'تهران')(l),
      timeZone: 'Asia/Tehran',
      topLabel: t('Back to top ↑', 'بازگشت به بالا ↑')(l),
      look: 'dark',
    },
  },
];

const theme = {
  primary: GREEN,
  secondary: '#c9b27a',
  dark: '#0f2a1f',
  background: '#f3f6f2',
  surface: '#ffffff',
  text: '#11201a',
  muted: '#5f6f66',
  radius: '1.5rem',
  buttonRadius: '9999px',
  fontFa: 'Vazirmatn',
  fontEn: 'Manrope',
  headerStyle: 'glass',
  cursor: 'default',
  pageTransition: 'fade',
};

if (ctx.home) {
  const settings = await ctx.api('GET', '/admin/settings');
  await ctx.api('PUT', '/admin/settings', {
    siteName: { fa: 'هلدینگ آغاج', en: 'Aghaj Holding' },
    logo: await logo()
      .then(({ bytes, name, type }) => ctx.upload(bytes, name, type))
      .then((m) => m.url),
    theme: { ...settings.theme, ...theme },
    // The header floats over the photo slider (and over the photo that opens the credits page).
    header: { ...settings.header, overlay: true },
    defaultLocale: 'fa',
    menu: [
      { href: '#what-we-do', label: { fa: 'حوزه‌ها', en: 'What we do' } },
      { href: '#places', label: { fa: 'کجا سرمایه‌گذاری کنیم', en: 'Where to invest' } },
      { href: '#consulting', label: { fa: 'مشاوره', en: 'Consulting' } },
      { href: '#imports', label: { fa: 'واردات', en: 'Imports' } },
      { href: '#group', label: { fa: 'شرکت‌های گروه', en: 'Group' } },
      { href: '#contact', label: { fa: 'تماس', en: 'Contact' } },
    ],
    business: {
      ...settings.business,
      type: settings.business?.type || 'FinancialService',
      email: EMAIL,
      phone: PHONE,
      city: 'Tehran',
      region: 'Tehran',
      country: 'IR',
    },
  });
}

await publishPage(ctx, {
  name: ctx.home ? 'Home' : 'Aghaj Holding',
  home: ctx.home,
  theme: ctx.home ? null : theme,
  slugs: ctx.home ? { fa: 'خانه', en: 'home' } : { fa: 'هلدینگ-آغاج', en: 'aghaj-holding' },
  titles: { fa: 'هلدینگ سرمایه‌گذاری آغاج', en: 'Aghaj Investment Holding' },
  seo: {
    fa: {
      seoTitle: 'هلدینگ سرمایه‌گذاری آغاج | سرمایه‌گذاری در ملک، واردات کالاهای اساسی و مشاوره',
      seoDescription:
        'هلدینگ آغاج در تهران به شما کمک می‌کند در ملک (چیتگر، شمال تهران، پردیس، کیش و شمال کشور) و واردات کالاهای اساسی مانند گوشت منجمد برزیلی سرمایه‌گذاری کنید. مشاوره قدرت اصلی ماست.',
    },
    en: {
      seoTitle: 'Aghaj Investment Holding | Property investment, basic-goods imports and consulting',
      seoDescription:
        'Aghaj Holding in Tehran helps you invest in property (Chitgar, north Tehran, Pardis, Kish and the Caspian coast) and in importing basic goods such as frozen meat from Brazil. Consulting is our key strength.',
    },
  },
  blocks,
});

await publishPage(ctx, {
  name: 'Aghaj photo credits',
  theme: ctx.home ? null : theme,
  slugs: { fa: 'اعتبار-عکس‌ها', en: 'photo-credits' },
  titles: { fa: 'اعتبار عکس‌ها — هلدینگ آغاج', en: 'Photo credits — Aghaj Holding' },
  blocks: (l) =>
    creditBlocks(
      l,
      credits,
      t(
        'The photos on this site are freely licensed pictures from Wikimedia Commons, chosen to show Tehran, Kish, the Caspian coast, the property market and the trade in basic goods. They are not photos of Aghaj Holding’s own projects, offices, shipments or people. Each one links to its page and original file on Commons, with its author and license.',
        'عکس‌های این سایت تصاویری با مجوز آزاد از ویکی‌انبار (Wikimedia Commons) هستند که برای نشان دادن تهران، کیش، شمال کشور، بازار ملک و تجارت کالاهای اساسی انتخاب شده‌اند. این‌ها عکس پروژه‌ها، دفاتر، محموله‌ها یا کارکنان هلدینگ آغاج نیستند. هر عکس به صفحه و فایل اصلی‌اش در ویکی‌انبار، با نام پدیدآورنده و مجوزش، پیوند دارد.',
      ),
      { heroImage: ctx.home ? img.skyline : '' },
    ),
});
