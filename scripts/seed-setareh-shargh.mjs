/**
 * Builds the Gostaresh Protein Setareh Shargh site (گسترش پروتئین ستاره شرق) in Persian and English: a Tehran company
 * that imports frozen beef, lamb and chicken from Brazil and other countries into Iran and sells it to wholesalers,
 * restaurants and stores. It is managed by Aghaj Investment Holding (seed-aghaj-holding.mjs); the two sites link to
 * each other but are separate sites.
 *
 * It uses the Studio and Spatial blocks and photo-led animated ones (huge type with photo badges, a ticker band,
 * moving photo columns, photos scrolling past a giant title, a sticky story of the cold chain, tilted cards, cuts
 * sliding sideways, words with pictures in them, fanned cards, a wheel of choices, a wavy call to action and a dark
 * footer), in the red of the company's logo. The photos
 * are real, freely licensed pictures from Wikimedia Commons kept in scripts/setareh-shargh/ (fetched with
 * fetch-commons-photos.mjs), each credited on a "Photo credits" page. They show the trade in general, not the
 * company's own products, ships, stores or people.
 *
 *   node scripts/seed-setareh-shargh.mjs          a separate page at /fa/ستاره-شرق and /en/setareh-shargh
 *   node scripts/seed-setareh-shargh.mjs --home   fills the home page and sets the site name, logo, menu and colors
 *   PREVIEW=setareh-shargh node scripts/seed-setareh-shargh.mjs
 *                                                the preview site <PREVIEW_URL>/preview/setareh-shargh, as with --home
 *
 * Also: CONTACT_EMAIL, CONTACT_PHONE (shown in the business details and the facts when given) and AGHAJ_URL (the Aghaj
 * Holding site; on a preview it defaults to <PREVIEW_URL>/preview/aghaj/). See preview-seed-lib.mjs for the connection
 * settings and DEPLOY.md, "Aghaj Holding and Setareh Shargh", for running it on the server.
 */
import { fileURLToPath } from 'node:url';
import { connect, creditBlocks, faDigits, loadSharp, loaderWith, ownLogo, publishPage, t, uploadPhotos } from './preview-seed-lib.mjs';

const ctx = await connect({
  name: 'Gostaresh Protein',
  prospect:
    'Gostaresh Protein Setareh Shargh (Tehran): frozen meat imports, an Aghaj Holding company. Filled by scripts/seed-setareh-shargh.mjs.',
});
const { url: img, credits } = await uploadPhotos(
  ctx,
  fileURLToPath(new URL('./setareh-shargh', import.meta.url)),
  'Setareh Shargh · Commons photos',
);
console.log(`Photos: ${credits.length}`);

const EMAIL = process.env.CONTACT_EMAIL ?? '';
const PHONE = process.env.CONTACT_PHONE ?? '';
const aghajBase = process.env.AGHAJ_URL ?? (ctx.preview ? `${ctx.previewUrl}/preview/aghaj/` : '');
const aghaj = (l) => (aghajBase ? `${aghajBase.replace(/\/?$/, '/')}${l}` : '#story');

/** The red and cream of the company's logo. */
const RED = '#d93654';
const CREAM = '#fde4c4';
const DIR = fileURLToPath(new URL('./setareh-shargh', import.meta.url));

/**
 * The logo: the company's own file in scripts/setareh-shargh/ (logo.svg, logo.png or logo.webp) when it is there.
 * Otherwise its "GP" mark redrawn: two rounded red shapes facing each other, each with a cream tab, on a transparent
 * background. The header writes the name "Gostaresh Protein" beside it.
 */
async function logo() {
  const own = await ownLogo(DIR);
  if (own) return own;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="540" viewBox="0 0 760 540">
    <g fill="${CREAM}">
      <path d="M 345 188 Q 365 188 365 208 V 362 A 50 50 0 0 1 315 412 H 255 V 278 A 90 90 0 0 1 345 188 Z"/>
      <path d="M 438 310 H 498 V 440 A 95 95 0 0 1 403 535 Q 388 535 388 520 V 360 A 50 50 0 0 1 438 310 Z"/>
    </g>
    <g fill="${RED}">
      <path d="M 115 0 H 345 Q 365 0 365 20 A 85 85 0 0 1 280 105 H 152 Q 112 105 112 145 V 270 Q 112 310 152 310 H 255 V 392 Q 255 412 235 412 H 115 A 115 115 0 0 1 0 297 V 115 A 115 115 0 0 1 115 0 Z"/>
      <path d="M 410 0 H 640 A 115 115 0 0 1 755 115 V 297 A 115 115 0 0 1 640 412 H 498 V 330 Q 498 310 518 310 H 605 Q 645 310 645 270 V 145 Q 645 105 605 105 H 475 A 85 85 0 0 1 390 20 Q 390 0 410 0 Z"/>
    </g></svg>`;
  return {
    bytes: await loadSharp()(Buffer.from(svg)).resize({ height: 240 }).png().toBuffer(),
    name: 'gostaresh-logo-gp.png',
    type: 'image/png',
  };
}

/**
 * The page, in the Studio blocks (awakeagency.dev: huge type, tilted service cards, a wheel of choices, a dark footer),
 * the Spatial ones (undplus.com: photos scrolling past a giant title, words with pictures in them, a ticker band, a
 * wavy call to action) and a few photo-led animated blocks, in the red of the logo.
 */
const blocks = (l) => [
  {
    id: 'hero',
    type: 'type-hero',
    props: {
      lines: t(
        [
          { start: 'FROM', end: 'BRAZIL' },
          { start: 'TO IRAN', end: 'AT' },
          { start: '−18°C.', end: '' },
        ],
        [
          { start: 'از', end: 'برزیل' },
          { start: 'تا ایران', end: 'در' },
          { start: '۱۸- درجه.', end: '' },
        ],
      )(l),
      text: t(
        'Gostaresh Protein imports halal frozen beef, lamb and chicken from Brazil and other countries, and keeps it frozen all the way to your cold store. An Aghaj Holding company.',
        'گسترش پروتئین گوشت منجمد حلال گوساله، گوسفند و مرغ را از برزیل و کشورهای دیگر وارد می‌کند و تا سردخانه‌ی شما منجمد نگه می‌دارد. از شرکت‌های هلدینگ آغاج.',
      )(l),
      badges: [
        { label: '', image: img.steaks, color: CREAM },
        { label: '', image: img.lamb, color: '#ffd0dc' },
        { label: '', image: img.chickenLegs, color: '#2a0e15' },
        { label: '', image: img.nelore, color: CREAM },
      ],
      placeLabel: t('Based in:', 'مستقر در:')(l),
      city: t('Tehran', 'تهران')(l),
      timeZone: 'Asia/Tehran',
      look: 'accent',
    },
  },
  {
    id: 'band',
    type: 'ticker-band',
    props: {
      items: t(
        ['Halal certified', 'Kept at −18 °C', 'From Brazil and beyond', 'Through Bandar Abbas', 'Wholesale across Iran'],
        ['گواهی حلال', 'نگهداری در ۱۸- درجه', 'از برزیل و کشورهای دیگر', 'از راه بندرعباس', 'فروش عمده در سراسر ایران'],
      )(l).map((label) => ({ label, image: '', icon: '', link: '' })),
      separator: 'burst',
      seconds: 30,
      reverse: false,
      look: 'second',
    },
  },
  {
    id: 'products',
    type: 'photo-columns',
    props: {
      anchor: 'products',
      eyebrow: t('Our products', 'محصولات ما')(l),
      title: t('What arrives in our containers', 'آنچه در کانتینرهای ما می‌رسد')(l),
      text: t(
        'Beef, lamb and chicken, whole and cut, frozen at the source. Sold by the carton, the pallet or the container.',
        'گوشت گوساله، گوسفند و مرغ، کامل و برش‌خورده، منجمد در مبدأ. فروش کارتنی، پالتی یا کانتینری.',
      )(l),
      buttonLabel: t('Ask for a price list', 'دریافت لیست قیمت')(l),
      buttonLink: '#order',
      photos: [
        ['beefShoulder', t('Beef shoulder', 'سردست گوساله')],
        ['lamb', t('Lamb cutlets', 'شیشلیک')],
        ['chickenMarket', t('Whole chicken', 'مرغ کامل')],
        ['steaks', t('Striploin', 'راسته')],
        ['lambCarcass', t('Lamb carcass', 'لاشه‌ی گوسفند')],
        ['chickenLegs', t('Leg quarters', 'ران مرغ')],
        ['beefBlock', t('Boneless blocks', 'گوشت بلوکی')],
        ['counter', t('At the counter', 'در ویترین')],
        ['beefRolls', t('Sliced beef', 'گوشت ورقه‌ای')],
      ].map(([key, caption]) => ({ image: img[key], caption: caption(l) })),
      seconds: 30,
      look: 'light',
    },
  },
  {
    id: 'about',
    type: 'blueprint-statement',
    props: {
      anchor: 'about',
      paragraphs: [
        t(
          'We buy red meat and chicken directly from approved plants in Brazil and other countries, and bring it to Iran ourselves.',
          'گوشت قرمز و مرغ را مستقیم از کشتارگاه‌های تأییدشده در برزیل و کشورهای دیگر می‌خریم و خودمان به ایران می‌آوریم.',
        ),
        t(
          'Every lot is halal slaughtered, frozen at the source, inspected again in Iran, and kept at −18 °C until it reaches the businesses that feed people every day.',
          'هر محموله ذبح اسلامی، در مبدأ منجمد و دوباره در ایران بازرسی می‌شود و تا رسیدن به کسب‌وکارهایی که هر روز غذای مردم را تأمین می‌کنند، در ۱۸- درجه می‌ماند.',
        ),
      ].map((text) => ({ text: text(l) })),
    },
  },
  {
    id: 'journey',
    type: 'work-done',
    props: {
      anchor: 'journey',
      title: t('FROM FARM TO FORK', 'از مزرعه تا سفره')(l),
      projects: [
        ['nelore', t('THE PASTURE', 'چراگاه'), t('Nelore cattle\nBrazil', 'گاوهای نلور\nبرزیل'), 'medium'],
        ['poultry', t('THE FARM', 'مرغداری'), t('Poultry\nBrazil', 'طیور\nبرزیل'), 'small'],
        ['ship', t('THE VOYAGE', 'سفر دریایی'), t('About a month at sea', 'حدود یک ماه در دریا'), 'wide'],
        ['reefers', t('THE COLD', 'سرما'), t('Sealed reefers\n−18 °C', 'کانتینر یخچال‌دار پلمب‌شده\n۱۸- درجه'), 'small'],
        ['port', t('THE PORT', 'بندر'), t('Shahid Rajaee\nBandar Abbas', 'شهید رجایی\nبندرعباس'), 'medium'],
        ['truck', t('THE ROAD', 'جاده'), t('Refrigerated trucks\nto every province', 'کامیون یخچال‌دار\nبه همه‌ی استان‌ها'), 'wide'],
        ['market', t('THE SHOP', 'قصابی'), t('Butchers and stores', 'قصابی‌ها و فروشگاه‌ها'), 'small'],
        ['chelo', t('THE TABLE', 'سفره'), t('Chelo kebab', 'چلوکباب'), 'medium'],
      ].map(([key, title, tags, size]) => ({ image: img[key], title: title(l), tags: tags(l), size, link: '#cold-chain' })),
      buttonLabel: t('See the cold chain', 'زنجیره‌ی سرما را ببینید')(l),
      buttonLink: '#cold-chain',
    },
  },
  {
    id: 'cold-chain',
    type: 'sticky-story',
    props: {
      anchor: 'cold-chain',
      title: t('The cold chain never breaks', 'زنجیره‌ی سرما هرگز قطع نمی‌شود')(l),
      imageSide: 'start',
      steps: [
        [
          'nelore',
          t('Step 1', 'مرحله ۱'),
          t('Halal slaughter at the source', 'ذبح اسلامی در مبدأ'),
          t(
            'Approved plants in Brazil and other countries, under the supervision of Muslim inspectors, with a halal certificate for every lot.',
            'کشتارگاه‌های تأییدشده در برزیل و کشورهای دیگر، زیر نظر ناظران مسلمان، با گواهی حلال برای هر محموله.',
          ),
        ],
        [
          'reefers',
          t('Step 2', 'مرحله ۲'),
          t('Frozen and sealed', 'انجماد و پلمب'),
          t(
            'Blast-frozen, packed in labelled cartons and sealed in refrigerated containers that keep a log of their temperature.',
            'انجماد سریع، بسته‌بندی در کارتن‌های برچسب‌دار و پلمب در کانتینرهای یخچال‌داری که دمایشان را ثبت می‌کنند.',
          ),
        ],
        [
          'port',
          t('Step 3', 'مرحله ۳'),
          t('By sea to Bandar Abbas', 'از راه دریا تا بندرعباس'),
          t(
            'At Shahid Rajaee port the veterinary organisation inspects and samples every shipment before clearance.',
            'در بندر شهید رجایی، سازمان دامپزشکی پیش از ترخیص هر محموله را بازرسی و نمونه‌برداری می‌کند.',
          ),
        ],
        [
          'truck',
          t('Step 4', 'مرحله ۴'),
          t('Cold store and delivery', 'سردخانه و تحویل'),
          t(
            'Into cold storage, then by refrigerated truck to wholesalers, restaurants and chain stores in every province.',
            'انتقال به سردخانه و سپس با کامیون یخچال‌دار به عمده‌فروشان، رستوران‌ها و فروشگاه‌های زنجیره‌ای در همه‌ی استان‌ها.',
          ),
        ],
      ].map(([key, eyebrow, title, text]) => ({ image: img[key], eyebrow: eyebrow(l), title: title(l), text: text(l) })),
    },
  },
  {
    id: 'customers',
    type: 'service-stack',
    props: {
      anchor: 'customers',
      title: t('WHO WE SELL TO', 'به چه کسانی می‌فروشیم')(l),
      services: [
        [
          t('Wholesalers and distributors', 'عمده‌فروشان و پخش‌کنندگان'),
          t(
            'Full containers or pallets, with every document you need to sell on.',
            'کانتینر کامل یا پالت، با همه‌ی مدارکی که برای فروش دوباره لازم دارید.',
          ),
          'nodes',
        ],
        [
          t('Butchers and meat shops', 'قصابی‌ها و فروشگاه‌های گوشت'),
          t('Beef and lamb by the carton, delivered frozen to your shop.', 'گوشت گوساله و گوسفند کارتنی، منجمد تا مغازه‌ی شما.'),
          'circles',
        ],
        [
          t('Restaurants and caterers', 'رستوران‌ها و تهیه‌غذاها'),
          t(
            'The same beef every week for kebab houses and kitchens that cook every day.',
            'هر هفته همان گوشت، برای کبابی‌ها و آشپزخانه‌هایی که هر روز می‌پزند.',
          ),
          'orbit',
        ],
        [
          t('Chain stores and food processors', 'فروشگاه‌های زنجیره‌ای و صنایع غذایی'),
          t(
            'Chicken parts and boneless beef for packing, sausages and ready meals.',
            'قطعات مرغ و گوشت بی‌استخوان برای بسته‌بندی، سوسیس و غذای آماده.',
          ),
          'letter',
        ],
      ].map(([title, text, drawing]) => ({
        title: title(l),
        text: text(l),
        drawing,
        buttonLabel: t('ask for a price', 'استعلام قیمت')(l),
        buttonLink: '#order',
      })),
    },
  },
  {
    id: 'cuts',
    type: 'horizontal-scroll',
    props: {
      anchor: 'cuts',
      title: t('The cuts we bring in', 'برش‌هایی که وارد می‌کنیم')(l),
      text: t(
        'Keep scrolling: the cuts slide past. Availability changes with each shipment.',
        'اسکرول کنید تا برش‌ها رد شوند. موجودی با هر محموله تغییر می‌کند.',
      )(l),
      cards: [
        [
          'beefShoulder',
          t('Beef', 'گوساله'),
          t('Beef shoulder', 'سردست گوساله'),
          t('Boneless, frozen. For stews and mince.', 'بی‌استخوان، منجمد. برای خورش و چرخ‌کرده.'),
        ],
        [
          'beefBlock',
          t('Beef', 'گوساله'),
          t('Beef blocks', 'گوشت بلوکی'),
          t('25 kg trimmed blocks for processors and kebab houses.', 'بلوک‌های ۲۵ کیلویی برای صنایع غذایی و کبابی‌ها.'),
        ],
        [
          'steak',
          t('Beef', 'گوساله'),
          t('Striploin', 'راسته'),
          t('Vacuum packed. For steaks and kebab barg.', 'وکیوم‌شده. برای استیک و کباب برگ.'),
        ],
        [
          'steaks',
          t('Beef', 'گوساله'),
          t('Rump and topside', 'فیله و قلوه‌گاه'),
          t('Lean cuts for restaurants.', 'برش‌های کم‌چرب برای رستوران‌ها.'),
        ],
        ['lamb', t('Lamb', 'گوسفند'), t('Lamb rack', 'شیشلیک'), t('Bone-in, the cut for shishlik.', 'با استخوان، برش مخصوص شیشلیک.')],
        [
          'lambCarcass',
          t('Lamb', 'گوسفند'),
          t('Lamb carcass', 'لاشه‌ی گوسفند'),
          t('Whole, 14–20 kg, for butchers who cut their own.', 'کامل، ۱۴ تا ۲۰ کیلو، برای قصاب‌هایی که خودشان برش می‌زنند.'),
        ],
        [
          'chickenLegs',
          t('Chicken', 'مرغ'),
          t('Leg quarters', 'ران مرغ'),
          t('Each piece frozen apart, easy to portion.', 'هر تکه جدا منجمد، راحت تقسیم می‌شود.'),
        ],
        [
          'chickenMarket',
          t('Chicken', 'مرغ'),
          t('Whole chicken', 'مرغ کامل'),
          t('Griller birds, 1–1.6 kg, packed one by one.', 'مرغ کبابی، ۱ تا ۱٫۶ کیلو، تک‌تک بسته‌بندی.'),
        ],
      ].map(([key, tag, title, text]) => ({ image: img[key], tag: tag(l), title: title(l), text: text(l), link: '#order' })),
    },
  },
  {
    id: 'promise',
    type: 'picture-words',
    props: {
      lines: [
        { before: t('Halal', 'ذبح')(l), media: 'image', shape: 'burst', image: img.lamb, after: t('certified.', 'اسلامی.')(l) },
        { before: t('Frozen', 'منجمد')(l), media: 'shape', shape: 'spark', image: '', after: t('at the source.', 'در مبدأ.')(l) },
        {
          before: t('Delivered', 'تحویل')(l),
          media: 'image',
          shape: 'sun',
          image: img.truck,
          after: t('across Iran.', 'در سراسر ایران.')(l),
        },
      ],
    },
  },
  {
    id: 'buy',
    type: 'card-fan',
    props: {
      anchor: 'buy',
      eyebrow: t('How to buy', 'چطور بخریم')(l),
      title: t('Three ways to order', 'سه راه سفارش')(l),
      text: t(
        'Prices per kilo follow each shipment; ask for this month’s list.',
        'قیمت هر کیلو با هر محموله تغییر می‌کند؛ لیست این ماه را بخواهید.',
      )(l),
      cards: [
        [
          'counter',
          t('By the carton', 'کارتنی'),
          t('From a few cartons, for shops and restaurants.', 'از چند کارتن، برای مغازه‌ها و رستوران‌ها.'),
        ],
        ['beefBlock', t('By the pallet', 'پالتی'), t('About a tonne, for chain stores.', 'حدود یک تن، برای فروشگاه‌های زنجیره‌ای.')],
        ['reefers', t('By the container', 'کانتینری'), t('About 25 tonnes, the best price per kilo.', 'حدود ۲۵ تن، بهترین قیمت هر کیلو.')],
        ['chelo', t('For kitchens', 'برای آشپزخانه‌ها'), t('Steady quality every week.', 'کیفیت ثابت هر هفته.')],
        ['koobideh', t('For kebab houses', 'برای کبابی‌ها'), t('Beef and lamb for koobideh.', 'گوساله و گوسفند برای کوبیده.')],
      ].map(([key, title, text]) => ({ image: img[key], title: title(l), text: text(l) })),
    },
  },
  {
    id: 'documents',
    type: 'project-archive',
    props: {
      anchor: 'documents',
      items: [
        ['nelore', t('Halal certificate', 'گواهی حلال'), t('Islamic body at the plant', 'نهاد اسلامی ناظر کشتارگاه')],
        ['herd', t('Health certificate', 'گواهی بهداشت'), t('Exporting country', 'کشور صادرکننده')],
        ['ship', t('Certificate of origin', 'گواهی مبدأ'), t('Where it was produced', 'محل تولید')],
        ['port', t('Veterinary release', 'ترخیص دامپزشکی'), t('Iran’s veterinary organisation', 'سازمان دامپزشکی ایران')],
        ['reefers', t('Temperature log', 'گزارش دما'), t('The whole voyage', 'تمام مسیر')],
        ['beefBlock', t('Invoice and packing list', 'فاکتور و لیست بسته‌بندی'), t('Weight, cuts, dates', 'وزن، برش، تاریخ')],
      ].map(([key, title, category]) => ({
        title: title(l),
        category: category(l),
        year: t('Every lot', 'هر محموله')(l),
        image: img[key],
        link: '#order',
      })),
      buttonLabel: t('ASK FOR THE PAPERS', 'مدارک را بخواهید')(l),
      buttonLink: '#order',
      line: true,
    },
  },
  {
    id: 'group',
    type: 'zoom-reveal',
    props: {
      anchor: 'group',
      intro: t('Part of something bigger', 'بخشی از مجموعه‌ای بزرگ‌تر')(l),
      eyebrow: t('Aghaj Holding', 'هلدینگ آغاج')(l),
      title: t('Managed by Aghaj Investment Holding', 'با مدیریت هلدینگ سرمایه‌گذاری آغاج')(l),
      text: t(
        'Aghaj invests in real estate and in basic goods; investors can take part in our shipments through it.',
        'آغاج در ملک و کالاهای اساسی سرمایه‌گذاری می‌کند؛ سرمایه‌گذاران می‌توانند از طریق آن در محموله‌های ما شریک شوند.',
      )(l),
      image: img.herd,
      buttonLabel: t('Visit Aghaj Holding', 'رفتن به سایت هلدینگ آغاج')(l),
      buttonLink: aghaj(l),
    },
  },
  {
    id: 'faq',
    type: 'faq',
    props: {
      anchor: 'faq',
      title: t('What buyers ask', 'پرسش‌های خریداران')(l),
      subtitle: '',
      items: [
        [
          t('Is the meat halal?', 'گوشت حلال است؟'),
          t(
            'Yes. It is slaughtered by the Islamic method under Muslim inspectors, and every lot has a halal certificate, checked again in Iran.',
            'بله. ذبح به روش اسلامی و زیر نظر ناظران مسلمان انجام می‌شود و هر محموله گواهی حلال دارد که در ایران هم دوباره بررسی می‌شود.',
          ),
        ],
        [
          t('What is the minimum order?', 'حداقل سفارش چقدر است؟'),
          t(
            'For shops and restaurants, a few cartons; for wholesalers, a pallet or a container.',
            'برای مغازه‌ها و رستوران‌ها چند کارتن؛ برای عمده‌فروشان، پالتی یا کانتینری.',
          ),
        ],
        [
          t('Do you deliver outside Tehran?', 'به خارج از تهران هم ارسال می‌کنید؟'),
          t('Yes, by refrigerated truck to every province.', 'بله، با کامیون یخچال‌دار به همه‌ی استان‌ها.'),
        ],
        [
          t('How long does frozen meat keep?', 'گوشت منجمد تا کی قابل نگهداری است؟'),
          t(
            'Usually up to 18 months at −18 °C for beef and lamb, and 12 months for chicken. The dates are on every carton.',
            'معمولاً گوشت گوساله و گوسفند تا ۱۸ ماه و مرغ تا ۱۲ ماه در ۱۸- درجه. تاریخ‌ها روی هر کارتن درج شده است.',
          ),
        ],
        [
          t('How do you set prices?', 'قیمت‌ها چطور تعیین می‌شود؟'),
          t(
            'Per kilo in rials, following each shipment. Send the form below for this month’s list.',
            'برای هر کیلو و به ریال، بر اساس هر محموله. فرم زیر را بفرستید تا لیست این ماه را بفرستیم.',
          ),
        ],
      ].map(([q, a]) => ({ q: q(l), a: a(l) })),
    },
  },
  {
    id: 'pick',
    type: 'need-picker',
    props: {
      lead: t('I need', 'نیاز دارم به')(l),
      options: t(
        ['beef', 'lamb', 'chicken', 'a container', 'prices'],
        ['گوساله', 'گوسفند', 'مرغ', 'یک کانتینر', 'لیست قیمت'],
      )(l).map((label) => ({ label, link: '#order' })),
      buttonLabel: t('next', 'بعدی')(l),
      look: 'accent',
    },
  },
  {
    id: 'order',
    type: 'contact-form',
    props: {
      anchor: 'order',
      title: t('Ask for a price list', 'دریافت لیست قیمت')(l),
      text: t(
        'Tell us what you need and where. We will call you back within one working day.',
        'بگویید چه چیزی و کجا لازم دارید. ظرف یک روز کاری با شما تماس می‌گیریم.',
      )(l),
      fields: [
        { label: t('Name', 'نام و نام خانوادگی')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Business name', 'نام کسب‌وکار')(l), type: 'text', required: false, options: '', placeholder: '' },
        { label: t('Mobile', 'تلفن همراه')(l), type: 'tel', required: true, options: '', placeholder: t('09…', '۰۹…')(l) },
        { label: t('City', 'شهر')(l), type: 'text', required: true, options: '', placeholder: '' },
        {
          label: t('Products', 'محصول')(l),
          type: 'select',
          required: true,
          options: t('Beef, Lamb, Chicken, A mix', 'گوشت گوساله, گوشت گوسفند, مرغ, ترکیبی')(l),
          placeholder: '',
        },
        {
          label: t('Quantity', 'مقدار')(l),
          type: 'text',
          required: false,
          options: '',
          placeholder: t('e.g. 40 cartons, or one container a month', 'مثلاً ۴۰ کارتن یا ماهی یک کانتینر')(l),
        },
        { label: t('Notes', 'توضیحات')(l), type: 'textarea', required: false, options: '', placeholder: '' },
      ],
      submitLabel: t('Send', 'ارسال')(l),
      successMessage: t('Thank you. We will call you within one working day.', 'ممنون. ظرف یک روز کاری با شما تماس می‌گیریم.')(l),
    },
  },
  {
    id: 'wave',
    type: 'wave-cta',
    props: {
      title: t('PRICE LIST', 'لیست قیمت')(l),
      letter: t('O', 'ی')(l),
      shape: 'burst',
      link: '#order',
      wave: true,
      look: 'accent',
    },
  },
  {
    id: 'footer',
    type: 'studio-footer',
    props: {
      name: t('Gostaresh Protein', 'گسترش پروتئین')(l),
      logo: '',
      links: [
        [t('Products', 'محصولات'), '#products'],
        [t('Cold chain', 'زنجیره‌ی سرما'), '#cold-chain'],
        [t('Cuts', 'برش‌ها'), '#cuts'],
        [t('How to buy', 'چطور بخریم'), '#buy'],
        [t('Price list', 'لیست قیمت'), '#order'],
      ].map(([label, link]) => ({ label: label(l), link })),
      social: [
        { label: t('Aghaj Holding', 'هلدینگ آغاج')(l), link: aghaj(l) },
        { label: t('Photo credits', 'اعتبار عکس‌ها')(l), link: t('photo-credits', 'اعتبار-عکس‌ها')(l) },
      ],
      emailLabel: t('Write to us', 'برای ما بنویسید')(l),
      email: EMAIL,
      copiedText: t('Copied', 'کپی شد')(l),
      placeLabel: t('Based in', 'مستقر در')(l),
      city: t('Tehran', 'تهران')(l),
      timeZone: 'Asia/Tehran',
      copyright: t(`© ${new Date().getFullYear()} Gostaresh Protein Setareh Shargh`, `© ${faDigits(1405)} گسترش پروتئین ستاره شرق`)(l),
      legal: [],
    },
  },
];

// Red, as in the logo, on the Studio look: white panels, a pale pink second color, deep maroon for the dark panels,
// the menu-button header and the Syne type of the original.
const theme = {
  primary: RED,
  secondary: '#ffd0dc',
  dark: '#2a0e15',
  background: '#ffffff',
  surface: '#f6f1f0',
  text: '#1f1114',
  muted: '#7a6266',
  radius: '2rem',
  buttonRadius: '9999px',
  fontFa: 'Vazirmatn',
  fontEn: 'Syne',
  headerStyle: 'studio',
  cursor: 'default',
  pageTransition: 'fade',
};

if (ctx.home) {
  const settings = await ctx.api('GET', '/admin/settings');
  const logoUrl = await logo()
    .then(({ bytes, name, type }) => ctx.upload(bytes, name, type))
    .then((m) => m.url);
  await ctx.api('PUT', '/admin/settings', {
    siteName: { fa: 'گسترش پروتئین', en: 'Gostaresh Protein' },
    logo: logoUrl,
    // While a page loads: the logo in a filling ring over a real photo that sharpens.
    loader: loaderWith({
      logo: logoUrl,
      background: img.nelore,
      text: { fa: 'گسترش پروتئین · از چراگاه‌های برزیل تا سفره‌های ایران', en: 'Gostaresh Protein · from the pastures of Brazil to Iran' },
      dark: theme.dark,
    }),
    theme: { ...settings.theme, ...theme },
    defaultLocale: 'fa',
    menu: [
      { href: '#products', label: { fa: 'محصولات', en: 'Products' } },
      { href: '#journey', label: { fa: 'از مزرعه تا سفره', en: 'Farm to fork' } },
      { href: '#cold-chain', label: { fa: 'زنجیره‌ی سرما', en: 'Cold chain' } },
      { href: '#customers', label: { fa: 'مشتریان', en: 'Who we sell to' } },
      { href: '#cuts', label: { fa: 'برش‌ها', en: 'Cuts' } },
      { href: '#buy', label: { fa: 'چطور بخریم', en: 'How to buy' } },
      { href: '#order', label: { fa: 'لیست قیمت', en: 'Price list' } },
    ],
    business: {
      ...settings.business,
      type: settings.business?.type || 'Store',
      email: EMAIL,
      phone: PHONE,
      city: 'Tehran',
      region: 'Tehran',
      country: 'IR',
    },
  });
}

await publishPage(ctx, {
  name: ctx.home ? 'Home' : 'Setareh Shargh',
  home: ctx.home,
  theme: ctx.home ? null : theme,
  slugs: ctx.home ? { fa: 'خانه', en: 'home' } : { fa: 'ستاره-شرق', en: 'setareh-shargh' },
  titles: { fa: 'گسترش پروتئین ستاره شرق — واردات گوشت منجمد', en: 'Gostaresh Protein Setareh Shargh — Frozen meat imports' },
  seo: {
    fa: {
      seoTitle: 'واردات گوشت منجمد گوساله، گوسفند و مرغ از برزیل | گسترش پروتئین',
      seoDescription:
        'گسترش پروتئین ستاره شرق، از شرکت‌های هلدینگ آغاج، گوشت منجمد حلال گوساله، گوسفند و مرغ را از برزیل و کشورهای دیگر وارد می‌کند و به سراسر ایران می‌فروشد.',
    },
    en: {
      seoTitle: 'Frozen beef, lamb and chicken imported from Brazil | Gostaresh Protein',
      seoDescription:
        'Gostaresh Protein Setareh Shargh, an Aghaj Holding company, imports halal frozen beef, lamb and chicken from Brazil and other countries and sells across Iran.',
    },
  },
  blocks,
});

await publishPage(ctx, {
  name: 'Setareh Shargh photo credits',
  theme: ctx.home ? null : theme,
  slugs: { fa: 'اعتبار-عکس‌ها', en: 'photo-credits' },
  titles: { fa: 'اعتبار عکس‌ها — گسترش پروتئین', en: 'Photo credits — Gostaresh Protein' },
  blocks: (l) =>
    creditBlocks(
      l,
      credits,
      t(
        'The photos on this site are freely licensed pictures from Wikimedia Commons, chosen to show the meat trade: cattle and poultry in Brazil, ports, refrigerated containers, cuts of meat and Persian dishes. They are not photos of Gostaresh Protein’s own products, shipments, stores or people. Each one links to its page and original file on Commons, with its author and license.',
        'عکس‌های این سایت تصاویری با مجوز آزاد از ویکی‌انبار (Wikimedia Commons) هستند که برای نشان دادن تجارت گوشت انتخاب شده‌اند: دام و طیور در برزیل، بندرها، کانتینرهای یخچال‌دار، برش‌های گوشت و غذاهای ایرانی. این‌ها عکس محصولات، محموله‌ها، فروشگاه‌ها یا کارکنان گسترش پروتئین نیستند. هر عکس به صفحه و فایل اصلی‌اش در ویکی‌انبار، با نام پدیدآورنده و مجوزش، پیوند دارد.',
      ),
    ),
});
