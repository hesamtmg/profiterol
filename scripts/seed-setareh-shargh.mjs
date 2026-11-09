/**
 * Builds the Gostaresh Protein Setareh Shargh site (گسترش پروتئین ستاره شرق) in Persian and English: a Tehran company
 * that imports frozen beef, lamb and chicken from Brazil and other countries into Iran and sells it to wholesalers,
 * restaurants and stores. It is managed by Aghaj Investment Holding (seed-aghaj-holding.mjs); the two sites link to
 * each other but are separate sites.
 *
 * It uses the Atelier blocks (photo hero, showroom shelf, step cards, story tabs, capability cards, a library of cuts,
 * fanned quotes, the real place and a photo call to action) in the red and cream of the company's logo. The photos
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

const blocks = (l) => [
  {
    id: 'hero',
    type: 'craft-hero',
    props: {
      eyebrow: t('Frozen meat importer · Tehran · An Aghaj Holding company', 'واردکننده‌ی گوشت منجمد · تهران · از شرکت‌های هلدینگ آغاج')(l),
      title: t('From the pastures of Brazil', 'از چراگاه‌های برزیل')(l),
      titleItalic: t('to tables across Iran.', 'تا سفره‌های ایران.')(l),
      text: t(
        'Frozen beef, lamb and chicken, halal slaughtered, frozen at the source and kept at −18 °C all the way to your cold store.',
        'گوشت منجمد گوساله، گوسفند و مرغ؛ ذبح اسلامی، منجمد در مبدأ و در دمای ۱۸- درجه تا سردخانه‌ی شما.',
      )(l),
      buttonLabel: t('Ask for a price list', 'دریافت لیست قیمت')(l),
      buttonLink: '#order',
      secondButtonLabel: t('Our products', 'محصولات ما')(l),
      secondButtonLink: '#products',
      image: img.hero,
      video: '',
    },
  },
  {
    id: 'strip',
    type: 'logo-strip',
    props: {
      title: '',
      logos: t(
        [
          'Frozen beef',
          'Frozen lamb',
          'Whole chicken',
          'Chicken parts',
          'Halal certified',
          'Kept at −18 °C',
          'From Brazil and beyond',
          'Wholesale across Iran',
        ],
        [
          'گوشت گوساله‌ی منجمد',
          'گوشت گوسفند منجمد',
          'مرغ کامل',
          'قطعات مرغ',
          'گواهی ذبح اسلامی',
          'نگهداری در ۱۸- درجه',
          'از برزیل و دیگر کشورها',
          'فروش عمده در سراسر ایران',
        ],
      )(l).map((name) => ({ image: '', name, link: '' })),
      seconds: 40,
      twoRows: false,
      look: 'dark',
    },
  },
  {
    id: 'showroom',
    type: 'showroom',
    props: {
      anchor: 'products',
      eyebrow: t('Our products', 'محصولات ما')(l),
      title: t('What arrives', 'آنچه')(l),
      titleItalic: t('in our containers.', 'در کانتینرهای ما می‌رسد.')(l),
      allLabel: t('Everything', 'همه')(l),
      items: [
        [img.beefShoulder, t('Beef shoulder', 'سردست گوساله'), t('Beef', 'گوساله')],
        [img.beefBlock, t('Boneless beef blocks', 'گوشت بی‌استخوان بلوکی'), t('Beef', 'گوساله')],
        [img.steaks, t('Striploin and rump', 'راسته و فیله'), t('Beef', 'گوساله')],
        [img.beefRolls, t('Sliced beef', 'گوشت ورقه‌ای'), t('Beef', 'گوساله')],
        [img.lamb, t('Lamb cutlets', 'شیشلیک گوسفندی'), t('Lamb', 'گوسفند')],
        [img.lambCarcass, t('Whole lamb carcasses', 'لاشه‌ی کامل گوسفند'), t('Lamb', 'گوسفند')],
        [img.chickenMarket, t('Whole chicken', 'مرغ کامل'), t('Chicken', 'مرغ')],
        [img.chickenLegs, t('Chicken leg quarters', 'ران مرغ'), t('Chicken', 'مرغ')],
      ].map(([image, name, category]) => ({ image, name: name(l), category: category(l), link: '#order' })),
      note: t(
        'Sold by the carton, the pallet or the container · price list on request',
        'فروش کارتنی، پالتی یا کانتینری · لیست قیمت با درخواست شما',
      )(l),
      buttonLabel: t('Ask for a price list', 'دریافت لیست قیمت')(l),
      buttonLink: '#order',
    },
  },
  {
    id: 'steps',
    type: 'step-cards',
    props: {
      anchor: 'cold-chain',
      eyebrow: t('The cold chain', 'زنجیره‌ی سرما')(l),
      title: t('From the farm', 'از مزرعه')(l),
      titleItalic: t('to your cold store.', 'تا سردخانه‌ی شما.')(l),
      note: t('Four steps, and the meat never leaves −18 °C.', 'چهار مرحله، و گوشت هیچ‌وقت از ۱۸- درجه بیرون نمی‌آید.')(l),
      steps: [
        [
          t('Step 01', 'مرحله ۰۱'),
          t('Halal slaughter at the source', 'ذبح اسلامی در مبدأ'),
          t(
            'Approved plants in Brazil and other countries, slaughtering under the supervision of Muslim inspectors, with a halal certificate for every lot.',
            'کشتارگاه‌های تأییدشده در برزیل و کشورهای دیگر، با ذبح زیر نظر ناظران مسلمان و گواهی حلال برای هر محموله.',
          ),
          t('Halal certificate', 'گواهی حلال'),
          t('For every lot', 'برای هر محموله'),
          t('Where it comes from', 'از کجا می‌آید'),
          '#origin',
        ],
        [
          t('Step 02', 'مرحله ۰۲'),
          t('Frozen and sealed', 'انجماد و پلمب'),
          t(
            'Blast-frozen, packed in labelled cartons and loaded into refrigerated containers that are sealed until Iran.',
            'انجماد سریع، بسته‌بندی در کارتن‌های برچسب‌دار و بارگیری در کانتینرهای یخچال‌دار که تا ایران پلمب می‌مانند.',
          ),
          t('−18 °C', '۱۸- درجه'),
          t('Recorded all the way', 'ثبت دما در تمام مسیر'),
          t('The containers', 'کانتینرها'),
          '#shipping',
        ],
        [
          t('Step 03', 'مرحله ۰۳'),
          t('By sea to Bandar Abbas', 'از راه دریا تا بندرعباس'),
          t(
            'Reefer containers cross the ocean to Shahid Rajaee port, where the veterinary organisation inspects and samples each shipment before clearance.',
            'کانتینرهای یخچال‌دار از اقیانوس تا بندر شهید رجایی می‌آیند و سازمان دامپزشکی پیش از ترخیص هر محموله را بازرسی و نمونه‌برداری می‌کند.',
          ),
          t('Veterinary check', 'بازرسی دامپزشکی'),
          t('Before clearance', 'پیش از ترخیص'),
          t('The shipping', 'حمل'),
          '#shipping',
        ],
        [
          t('Step 04', 'مرحله ۰۴'),
          t('Cold store and delivery', 'سردخانه و تحویل'),
          t(
            'Into cold storage, then by refrigerated truck to wholesalers, restaurants and chain stores across Iran.',
            'انتقال به سردخانه و سپس با کامیون یخچال‌دار به عمده‌فروشان، رستوران‌ها و فروشگاه‌های زنجیره‌ای در سراسر ایران.',
          ),
          t('Refrigerated trucks', 'کامیون یخچال‌دار'),
          t('To any province', 'به همه‌ی استان‌ها'),
          t('Order', 'سفارش'),
          '#order',
        ],
      ].map(([label, title, text, detail, detailNote, linkLabel, link]) => ({
        label: label(l),
        title: title(l),
        text: text(l),
        detail: detail(l),
        detailNote: detailNote(l),
        linkLabel: linkLabel(l),
        link,
      })),
      footnote: t('Need a certificate or a test report for a shipment?', 'گواهی یا برگه‌ی آزمایش یک محموله را لازم دارید؟')(l),
      footnoteLabel: t('Ask us', 'از ما بخواهید')(l),
      footnoteLink: '#order',
    },
  },
  {
    id: 'origin',
    type: 'place-photos',
    props: {
      anchor: 'origin',
      photo: img.nelore,
      photo2: img.poultry,
      badgeTitle: t('Brazil', 'برزیل')(l),
      badgeText: t('and other approved\nexporting countries', 'و دیگر کشورهای\nصادرکننده‌ی تأییدشده')(l),
      eyebrow: t('Where it comes from', 'از کجا می‌آید')(l),
      title: t('Raised on', 'پرورش‌یافته در')(l),
      titleItalic: t('open pasture.', 'چراگاه باز.')(l),
      text: t(
        'Most of our beef comes from Nelore cattle raised on grass in Brazil, one of the world’s largest exporters of halal meat. We also buy lamb and chicken from other approved countries, so supply does not depend on a single source.',
        'بیشتر گوشت گوساله‌ی ما از گاوهای نلور است که در چراگاه‌های برزیل پرورش می‌یابند؛ یکی از بزرگ‌ترین صادرکنندگان گوشت حلال در جهان. گوشت گوسفند و مرغ را از کشورهای تأییدشده‌ی دیگر هم می‌خریم تا تأمین به یک منبع وابسته نباشد.',
      )(l),
      buttonLabel: t('How it is shipped', 'چطور حمل می‌شود')(l),
      buttonLink: '#shipping',
      photoSide: 'start',
    },
  },
  {
    id: 'shipping',
    type: 'place-photos',
    props: {
      anchor: 'shipping',
      photo: img.port,
      photo2: img.reefers,
      badgeTitle: t('−18 °C', '۱۸- درجه')(l),
      badgeText: t('From the ship\nto your store', 'از کشتی\nتا فروشگاه شما')(l),
      eyebrow: t('Shipping', 'حمل')(l),
      title: t('The cold chain', 'زنجیره‌ی سرما')(l),
      titleItalic: t('never breaks.', 'هرگز قطع نمی‌شود.')(l),
      text: t(
        'Refrigerated containers keep their own temperature on the ship, at the port of Bandar Abbas and on the road. We check the temperature log of every container before it is opened.',
        'کانتینرهای یخچال‌دار روی کشتی، در بندرعباس و در جاده دمای خود را حفظ می‌کنند. پیش از باز شدن هر کانتینر، گزارش دمای آن را بررسی می‌کنیم.',
      )(l),
      buttonLabel: t('Order', 'سفارش')(l),
      buttonLink: '#order',
      photoSide: 'end',
    },
  },
  {
    id: 'story',
    type: 'story-tabs',
    props: {
      anchor: 'story',
      eyebrow: t('About us', 'درباره‌ی ما')(l),
      title: t('Protein for Iran.', 'پروتئین برای ایران.')(l),
      titleItalic: t('Imported properly.', 'درست وارد شده.')(l),
      links: [
        { label: t('Our products', 'محصولات ما')(l), link: '#products' },
        { label: t('Aghaj Holding', 'هلدینگ آغاج')(l), link: aghaj(l) },
      ],
      tabs: [
        [
          t('Who we are', 'ما که هستیم'),
          t(
            'Gostaresh Protein Setareh Shargh imports red meat and chicken into Iran. We buy directly from exporting plants, handle the shipping and clearance ourselves, and sell to the businesses that feed people every day.',
            'گسترش پروتئین ستاره شرق واردکننده‌ی گوشت قرمز و مرغ به ایران است. مستقیم از کشتارگاه‌های صادرکننده می‌خریم، حمل و ترخیص را خودمان انجام می‌دهیم و به کسب‌وکارهایی می‌فروشیم که هر روز غذای مردم را تأمین می‌کنند.',
          ),
        ],
        [
          t('Halal and health', 'حلال و بهداشت'),
          t(
            'Every lot comes with its halal certificate and health certificate from the country of origin, and is inspected again by Iran’s veterinary organisation before it is released.',
            'هر محموله با گواهی حلال و گواهی بهداشت کشور مبدأ می‌رسد و پیش از ترخیص، دوباره سازمان دامپزشکی ایران آن را بازرسی می‌کند.',
          ),
        ],
        [
          t('Part of Aghaj Holding', 'عضو هلدینگ آغاج'),
          t(
            'We are managed by Aghaj Investment Holding, which also invests in real estate and other basic goods. Investors can take part in our shipments through the holding.',
            'مدیریت ما با هلدینگ سرمایه‌گذاری آغاج است که در املاک و سایر کالاهای اساسی هم سرمایه‌گذاری می‌کند. سرمایه‌گذاران می‌توانند از طریق هلدینگ در محموله‌های ما شریک شوند.',
          ),
        ],
      ].map(([label, text]) => ({ label: label(l), text: text(l) })),
    },
  },
  {
    id: 'customers',
    type: 'capability-stack',
    props: {
      anchor: 'customers',
      eyebrow: t('Who we sell to', 'به چه کسانی می‌فروشیم')(l),
      title: t('For the businesses', 'برای کسب‌وکارهایی')(l),
      titleItalic: t('that feed Iran.', 'که غذای ایران را تأمین می‌کنند.')(l),
      cards: [
        [
          t('Wholesalers and distributors', 'عمده‌فروشان و پخش‌کنندگان'),
          t(
            'Full containers or pallets, with the documents you need to sell on.',
            'کانتینر کامل یا پالت، با مدارکی که برای فروش دوباره لازم دارید.',
          ),
          img.reefers,
          t('Reefer container', 'کانتینر یخچال‌دار'),
          t('About 25 tonnes · sealed', 'حدود ۲۵ تن · پلمب‌شده'),
          img.truck,
          t('Refrigerated truck', 'کامیون یخچال‌دار'),
          t('To any province', 'به همه‌ی استان‌ها'),
        ],
        [
          t('Butchers and meat shops', 'قصابی‌ها و فروشگاه‌های گوشت'),
          t('Beef and lamb by the carton, delivered frozen to your shop.', 'گوشت گوساله و گوسفند کارتنی، منجمد تا مغازه‌ی شما.'),
          img.market,
          t('A meat shop in Fars', 'قصابی‌ای در فارس'),
          t('By the carton', 'کارتنی'),
          img.counter,
          t('On the counter', 'در ویترین'),
          t('Cut to order', 'برش به سفارش'),
        ],
        [
          t('Restaurants and caterers', 'رستوران‌ها و تهیه‌غذاها'),
          t(
            'Steady quality for kebab houses and kitchens that cook every day.',
            'کیفیت ثابت برای کبابی‌ها و آشپزخانه‌هایی که هر روز می‌پزند.',
          ),
          img.koobideh,
          t('Kebab koobideh', 'کباب کوبیده'),
          t('From our beef and lamb', 'از گوشت گوساله و گوسفند ما'),
          img.chelo,
          t('Chelo kebab', 'چلوکباب'),
          t('For restaurants', 'برای رستوران‌ها'),
        ],
        [
          t('Chain stores and processors', 'فروشگاه‌های زنجیره‌ای و صنایع غذایی'),
          t(
            'Chicken parts and boneless beef for packing, sausages and ready meals.',
            'قطعات مرغ و گوشت بی‌استخوان برای بسته‌بندی، سوسیس و غذای آماده.',
          ),
          img.chickenLegs,
          t('Chicken leg quarters', 'ران مرغ'),
          t('IQF · 10 kg cartons', 'انجماد انفرادی · کارتن ۱۰ کیلویی'),
          img.beefBlock,
          t('Boneless beef', 'گوشت بی‌استخوان'),
          t('For processing', 'برای فراوری'),
        ],
      ].map(([title, text, image, imageTitle, imageNote, image2, image2Title, image2Note]) => ({
        title: title(l),
        text: text(l),
        image,
        imageTitle: imageTitle(l),
        imageNote: imageNote(l),
        image2,
        image2Title: image2Title(l),
        image2Note: image2Note(l),
        linkLabel: t('Ask for a price', 'استعلام قیمت')(l),
        link: '#order',
      })),
      footnote: t('Tehran · frozen meat imports', 'تهران · واردات گوشت منجمد')(l),
      buttonLabel: t('Order', 'سفارش')(l),
      buttonLink: '#order',
    },
  },
  {
    id: 'cuts',
    type: 'swatch-library',
    props: {
      anchor: 'cuts',
      eyebrow: t('Cuts library', 'کتابخانه‌ی برش‌ها')(l),
      title: t('The cuts', 'برش‌هایی که')(l),
      titleItalic: t('we bring in.', 'وارد می‌کنیم.')(l),
      swatches: [
        [
          img.beefShoulder,
          t('Beef shoulder', 'سردست گوساله'),
          t('Boneless · frozen', 'بی‌استخوان · منجمد'),
          t('For stews, khoresh and mince.', 'برای خورش، آبگوشت و چرخ‌کرده.'),
        ],
        [
          img.beefBlock,
          t('Beef blocks', 'گوشت بلوکی'),
          t('Boneless · 25 kg', 'بی‌استخوان · ۲۵ کیلو'),
          t('Trimmed blocks for processors and kebab houses.', 'بلوک‌های پاک‌شده برای صنایع غذایی و کبابی‌ها.'),
        ],
        [img.steak, t('Striploin', 'راسته'), t('Vacuum packed', 'وکیوم‌شده'), t('For steaks and barg kebab.', 'برای استیک و کباب برگ.')],
        [
          img.steaks,
          t('Rump and topside', 'فیله و قلوه‌گاه'),
          t('Vacuum packed', 'وکیوم‌شده'),
          t('Lean cuts for restaurants.', 'برش‌های کم‌چرب برای رستوران‌ها.'),
        ],
        [
          img.beefRolls,
          t('Sliced beef', 'گوشت ورقه‌ای'),
          t('Thin · frozen', 'نازک · منجمد'),
          t('Ready for hotpot, stir-fry and sandwiches.', 'آماده برای خوراک، تابه‌ای و ساندویچ.'),
        ],
        [img.lamb, t('Lamb rack', 'شیشلیک'), t('Bone-in', 'با استخوان'), t('The cut for shishlik.', 'برش مخصوص شیشلیک.')],
        [
          img.lambCarcass,
          t('Lamb carcass', 'لاشه‌ی گوسفند'),
          t('Whole · 14–20 kg', 'کامل · ۱۴ تا ۲۰ کیلو'),
          t('For butchers who cut their own.', 'برای قصاب‌هایی که خودشان برش می‌زنند.'),
        ],
        [
          img.chickenLegs,
          t('Chicken leg quarters', 'ران مرغ'),
          t('IQF', 'انجماد انفرادی'),
          t('Each piece frozen apart, easy to portion.', 'هر تکه جدا منجمد شده و راحت تقسیم می‌شود.'),
        ],
        [
          img.chickenMarket,
          t('Whole chicken', 'مرغ کامل'),
          t('1.0–1.6 kg', '۱ تا ۱٫۶ کیلو'),
          t('Griller birds, packed one by one.', 'مرغ کبابی، تک‌تک بسته‌بندی‌شده.'),
        ],
      ].map(([image, name, spec, text]) => ({ image, name: name(l), spec: spec(l), text: text(l) })),
      hint: t('Tap any cut for details', 'برای جزئیات روی هر برش بزنید')(l),
      note: t(
        'Availability changes with each shipment. Ask for this month’s list.',
        'موجودی با هر محموله تغییر می‌کند. لیست این ماه را از ما بخواهید.',
      )(l),
      buttonLabel: t('Ask for this month’s list', 'لیست این ماه را بخواهید')(l),
      buttonLink: '#order',
    },
  },
  {
    id: 'quotes',
    type: 'quote-fan',
    props: {
      eyebrow: t('What customers say', 'مشتریان چه می‌گویند')(l),
      title: t('From the people', 'از زبان کسانی که')(l),
      titleItalic: t('we deliver to.', 'برایشان بار می‌بریم.')(l),
      quotes: [
        [
          t(
            'The cartons arrive hard frozen and the labels match the invoice, every time.',
            'کارتن‌ها کاملاً منجمد می‌رسند و برچسب‌ها همیشه با فاکتور یکی است.',
          ),
          t('Ali R.', 'علی ر.'),
          t('Butcher, Tehran', 'قصاب، تهران'),
        ],
        [
          t(
            'Our koobideh needs the same beef every week. They keep it the same.',
            'کوبیده‌ی ما هر هفته همان گوشت را لازم دارد. آن‌ها همان را نگه می‌دارند.',
          ),
          t('Mehdi N.', 'مهدی ن.'),
          t('Kebab house', 'کبابی'),
        ],
        [
          t('They sent the halal and health certificates before I even asked.', 'گواهی حلال و بهداشت را پیش از آنکه بخواهم فرستادند.'),
          t('Sima T.', 'سیما ت.'),
          t('Chain store buyer', 'خریدار فروشگاه زنجیره‌ای'),
        ],
        [
          t('A full container to Mashhad, on the day they promised.', 'یک کانتینر کامل تا مشهد، همان روزی که قول داده بودند.'),
          t('Karim H.', 'کریم ح.'),
          t('Distributor', 'پخش‌کننده'),
        ],
        [
          t('Clear prices per kilo and no surprises on delivery.', 'قیمت روشن برای هر کیلو و بدون غافلگیری هنگام تحویل.'),
          t('Parisa M.', 'پریسا م.'),
          t('Caterer', 'تهیه‌غذا'),
        ],
      ].map(([quote, name, role]) => ({ quote: quote(l), name: name(l), role: role(l) })),
      seconds: 6,
    },
  },
  {
    id: 'visit',
    type: 'place-facts',
    props: {
      anchor: 'visit',
      eyebrow: t('A real company', 'یک شرکت واقعی')(l),
      title: t('Real shipments.', 'محموله‌های واقعی.')(l),
      titleItalic: t('Real documents.', 'مدارک واقعی.')(l),
      text: t(
        'Every shipment comes with its papers: the halal certificate, the health certificate, the veterinary release and the invoice. Ask for them before you buy.',
        'هر محموله با مدارکش می‌آید: گواهی حلال، گواهی بهداشت، مجوز ترخیص دامپزشکی و فاکتور. پیش از خرید آن‌ها را از ما بخواهید.',
      )(l),
      image: img.ship,
      place: t('Tehran, Iran', 'تهران، ایران')(l),
      address: t('Office visits by appointment', 'مراجعه به دفتر با هماهنگی قبلی')(l),
      mapLabel: '',
      mapLink: '',
      details: [
        { value: t('Saturday to Wednesday, 8:00–17:00', 'شنبه تا چهارشنبه، ۸ تا ۱۷')(l), label: t('Office hours', 'ساعت کاری')(l) },
        ...(PHONE ? [{ value: l === 'fa' ? faDigits(PHONE) : PHONE, label: t('Phone', 'تلفن')(l) }] : []),
        ...(EMAIL ? [{ value: EMAIL, label: t('Email', 'ایمیل')(l) }] : []),
        { value: t('Refrigerated trucks, to every province', 'کامیون یخچال‌دار، به همه‌ی استان‌ها')(l), label: t('Delivery', 'ارسال')(l) },
      ],
      facts: [
        [t('−18°C', '۱۸-°')(l), t('All the way', 'در تمام مسیر')(l)],
        [t('100%', '۱۰۰٪')(l), t('Halal certified', 'گواهی حلال')(l)],
        [t('3', '۳')(l), t('Kinds of meat', 'نوع گوشت')(l)],
        [t('31', '۳۱')(l), t('Provinces served', 'استان زیر پوشش')(l)],
      ].map(([value, label]) => ({ value, label })),
      badgesTitle: t('What we promise', 'آنچه قول می‌دهیم')(l),
      badges: [
        [t('Halal slaughter', 'ذبح اسلامی'), t('Certificate with every lot', 'گواهی برای هر محموله')],
        [t('Unbroken cold', 'سرمای بی‌وقفه'), t('Temperature log checked', 'بررسی گزارش دما')],
        [t('Veterinary release', 'ترخیص دامپزشکی'), t('Inspected in Iran', 'بازرسی‌شده در ایران')],
        [t('Honest weight', 'وزن درست'), t('Net weight on every carton', 'وزن خالص روی هر کارتن')],
      ].map(([name, text]) => ({ name: name(l), text: text(l) })),
      badgesNote: '',
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
            'Yes. It is slaughtered by the Islamic method under the supervision of Muslim inspectors, and every lot has a halal certificate, checked again in Iran.',
            'بله. ذبح به روش اسلامی و زیر نظر ناظران مسلمان انجام می‌شود و هر محموله گواهی حلال دارد که در ایران هم دوباره بررسی می‌شود.',
          ),
        ],
        [
          t('What is the minimum order?', 'حداقل سفارش چقدر است؟'),
          t(
            'For shops and restaurants, from a few cartons; for wholesalers, by the pallet or the container.',
            'برای مغازه‌ها و رستوران‌ها از چند کارتن؛ برای عمده‌فروشان، پالتی یا کانتینری.',
          ),
        ],
        [
          t('Do you deliver outside Tehran?', 'به خارج از تهران هم ارسال می‌کنید؟'),
          t('Yes, by refrigerated truck to every province.', 'بله، با کامیون یخچال‌دار به همه‌ی استان‌ها.'),
        ],
        [
          t('How long does frozen meat keep?', 'گوشت منجمد تا کی قابل نگهداری است؟'),
          t(
            'Usually up to 18 months at −18 °C for beef and lamb, and 12 months for chicken. The production and expiry dates are on every carton.',
            'معمولاً گوشت گوساله و گوسفند تا ۱۸ ماه و مرغ تا ۱۲ ماه در دمای ۱۸- درجه. تاریخ تولید و انقضا روی هر کارتن درج شده است.',
          ),
        ],
        [
          t('How do you set prices?', 'قیمت‌ها چطور تعیین می‌شود؟'),
          t(
            'Prices are per kilo in rials and follow each shipment. Send the form below and we will send you this month’s list.',
            'قیمت‌ها برای هر کیلو و به ریال است و با هر محموله تغییر می‌کند. فرم زیر را بفرستید تا لیست این ماه را برایتان بفرستیم.',
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
    id: 'cta',
    type: 'photo-cta',
    props: {
      eyebrow: t('Gostaresh Protein Setareh Shargh', 'گسترش پروتئین ستاره شرق')(l),
      title: t('Good meat,', 'گوشت خوب،')(l),
      titleItalic: t('kept cold all the way.', 'سرد تا آخر مسیر.')(l),
      text: t(
        'From the pastures of Brazil to your kitchen, with every certificate and every degree accounted for.',
        'از چراگاه‌های برزیل تا آشپزخانه‌ی شما، با همه‌ی گواهی‌ها و کنترل دما در هر قدم.',
      )(l),
      image: img.herd,
      stats: [
        [t('−18°C', '۱۸-°'), t('Cold chain', 'زنجیره‌ی سرما')],
        [t('Halal', 'حلال'), t('Certified', 'با گواهی')],
        [t('Iran-wide', 'سراسری'), t('Delivery', 'ارسال')],
      ].map(([value, label]) => ({ value: value(l), label: label(l) })),
      buttonLabel: t('Ask for a price list', 'دریافت لیست قیمت')(l),
      buttonLink: '#order',
      columns: [
        [t('Products', 'محصولات'), t('Beef, lamb and chicken', 'گوساله، گوسفند و مرغ'), t('Showroom', 'ویترین'), '#products'],
        [t('Cold chain', 'زنجیره‌ی سرما'), t('From the farm to your store', 'از مزرعه تا فروشگاه'), t('Steps', 'مراحل'), '#cold-chain'],
        [t('Aghaj Holding', 'هلدینگ آغاج'), t('Our parent company', 'شرکت مادر ما'), t('Visit', 'رفتن به سایت'), aghaj],
        [
          t('Photo credits', 'اعتبار عکس‌ها'),
          t('Where every photo comes from', 'منبع هر عکس'),
          t('Sources', 'منابع'),
          t('photo-credits', 'اعتبار-عکس‌ها'),
        ],
      ].map(([title, text, linkLabel, link]) => ({
        title: title(l),
        text: text(l),
        linkLabel: linkLabel(l),
        link: typeof link === 'function' ? link(l) : link,
      })),
    },
  },
];

/** Sections added between the ones in `blocks` (see `withExtra` below), each a function of the locale. */
const extra = {
  meat: (l) => ({
    id: 'meat',
    type: 'flip-cards',
    props: {
      anchor: 'meat',
      title: t('Know your meat', 'گوشتتان را بشناسید')(l),
      items: [
        [
          img.steaks,
          t('Beef', 'گوشت گوساله'),
          t(
            'From grass-fed Nelore cattle. About 20 g of protein in 100 g of lean beef. For kebab barg, koobideh, stews and steaks.',
            'از گاوهای نلور علف‌خوار. حدود ۲۰ گرم پروتئین در هر ۱۰۰ گرم گوشت کم‌چرب. برای کباب برگ، کوبیده، خورش و استیک.',
          ),
        ],
        [
          img.lamb,
          t('Lamb', 'گوشت گوسفند'),
          t(
            'Whole carcasses and cuts. Rich in flavour, about 18 g of protein in 100 g. For shishlik, abgoosht and Persian stews.',
            'لاشه‌ی کامل و برش‌خورده. خوش‌طعم، حدود ۱۸ گرم پروتئین در هر ۱۰۰ گرم. برای شیشلیک، آبگوشت و خورش‌های ایرانی.',
          ),
        ],
        [
          img.chickenLegs,
          t('Chicken', 'مرغ'),
          t(
            'Whole birds and parts, each piece frozen apart. About 19 g of protein in 100 g. For joojeh kebab, rice dishes and processing.',
            'مرغ کامل و قطعه‌بندی‌شده، هر تکه جدا منجمد. حدود ۱۹ گرم پروتئین در هر ۱۰۰ گرم. برای جوجه‌کباب، پلوها و فراوری.',
          ),
        ],
      ].map(([image, title, back]) => ({
        image,
        title: title(l),
        back: back(l),
        buttonLabel: t('Price list', 'لیست قیمت')(l),
        buttonLink: '#order',
      })),
    },
  }),
  journey: (l) => ({
    id: 'journey',
    type: 'timeline',
    props: {
      anchor: 'journey',
      title: t('A shipment’s journey', 'سفر یک محموله')(l),
      items: [
        [
          t('Day 1', 'روز ۱'),
          t('Halal slaughter', 'ذبح اسلامی'),
          t('At an approved plant in Brazil, under Muslim inspectors.', 'در کشتارگاهی تأییدشده در برزیل، زیر نظر ناظران مسلمان.'),
        ],
        [
          t('Day 2', 'روز ۲'),
          t('Blast-frozen and packed', 'انجماد سریع و بسته‌بندی'),
          t('Down to −18 °C, in labelled cartons.', 'تا دمای ۱۸- درجه، در کارتن‌های برچسب‌دار.'),
        ],
        [
          t('Within a week', 'تا یک هفته'),
          t('Sealed and loaded', 'پلمب و بارگیری'),
          t('Into refrigerated containers at a Brazilian port.', 'در کانتینرهای یخچال‌دار در بندری در برزیل.'),
        ],
        [
          t('About a month', 'حدود یک ماه'),
          t('At sea', 'در دریا'),
          t('Across the ocean to Shahid Rajaee port, Bandar Abbas.', 'از اقیانوس تا بندر شهید رجایی، بندرعباس.'),
        ],
        [
          t('A few days', 'چند روز'),
          t('Inspection and clearance', 'بازرسی و ترخیص'),
          t('Veterinary samples, documents, customs.', 'نمونه‌برداری دامپزشکی، مدارک، گمرک.'),
        ],
        [
          t('Then', 'سپس'),
          t('Cold store and your door', 'سردخانه و درِ فروشگاه شما'),
          t('By refrigerated truck, to any province.', 'با کامیون یخچال‌دار، به هر استان.'),
        ],
      ].map(([date, title, text]) => ({ date: date(l), title: title(l), text: text(l) })),
    },
  }),
  gallery: (l) => ({
    id: 'gallery',
    type: 'gallery',
    props: {
      anchor: 'gallery',
      title: t('From farm to fork', 'از مزرعه تا سفره')(l),
      layout: 'masonry',
      columns: '3',
      images: [
        ['nelore', t('Nelore cattle in Brazil', 'گاوهای نلور در برزیل')],
        ['poultry', t('Poultry farm', 'مرغداری')],
        ['herd', t('The herd', 'گله')],
        ['ship', t('Container ship', 'کشتی کانتینری')],
        ['reefers', t('Refrigerated containers', 'کانتینرهای یخچال‌دار')],
        ['port', t('Bandar Abbas', 'بندرعباس')],
        ['truck', t('On the road at −18 °C', 'در جاده با دمای ۱۸- درجه')],
        ['market', t('At the butcher’s', 'در قصابی')],
        ['chelo', t('On the table', 'روی سفره')],
      ].map(([key, caption]) => ({ image: img[key], caption: caption(l) })),
    },
  }),
  buy: (l) => ({
    id: 'buy',
    type: 'pricing',
    props: {
      anchor: 'buy',
      title: t('How to buy', 'چطور بخریم')(l),
      subtitle: t(
        'Prices per kilo follow each shipment. Ask for this month’s list.',
        'قیمت هر کیلو با هر محموله تغییر می‌کند. لیست این ماه را بخواهید.',
      )(l),
      currency: '',
      monthlyLabel: '',
      yearlyLabel: '',
      plans: [
        {
          name: t('By the carton', 'کارتنی')(l),
          price: t('From a few cartons', 'از چند کارتن')(l),
          description: t('For butchers, restaurants and caterers.', 'برای قصابی‌ها، رستوران‌ها و تهیه‌غذاها.')(l),
          features: t(
            'Mix beef, lamb and chicken\nDelivered frozen in Tehran\nInvoice with every order\n-Container prices',
            'ترکیب گوساله، گوسفند و مرغ\nتحویل منجمد در تهران\nفاکتور برای هر سفارش\n-قیمت کانتینری',
          )(l),
          highlighted: false,
          badge: '',
        },
        {
          name: t('By the pallet', 'پالتی')(l),
          price: t('About a tonne', 'حدود یک تن')(l),
          description: t('For chain stores and food processors.', 'برای فروشگاه‌های زنجیره‌ای و صنایع غذایی.')(l),
          features: t(
            'Better price per kilo\nRefrigerated truck to any province\nCertificates with every lot\nRegular monthly deliveries',
            'قیمت بهتر برای هر کیلو\nکامیون یخچال‌دار به هر استان\nگواهی‌ها برای هر محموله\nتحویل منظم ماهانه',
          )(l),
          highlighted: false,
          badge: '',
        },
        {
          name: t('By the container', 'کانتینری')(l),
          price: t('About 25 tonnes', 'حدود ۲۵ تن')(l),
          description: t('For wholesalers and distributors.', 'برای عمده‌فروشان و پخش‌کنندگان.')(l),
          features: t(
            'The best price per kilo\nA sealed reefer, straight from the port\nAll shipping documents\nTemperature log of the voyage',
            'بهترین قیمت هر کیلو\nکانتینر پلمب‌شده، مستقیم از بندر\nهمه‌ی مدارک حمل\nگزارش دمای کل سفر',
          )(l),
          highlighted: true,
          badge: t('Best price per kilo', 'بهترین قیمت هر کیلو')(l),
        },
      ].map((p) => ({ ...p, yearlyPrice: '', period: '', buttonLabel: t('Ask for a price', 'استعلام قیمت')(l), buttonLink: '#order' })),
    },
  }),
  documents: (l) => ({
    id: 'documents',
    type: 'card-grid',
    props: {
      anchor: 'documents',
      title: t('The papers with every shipment', 'مدارک همراه هر محموله')(l),
      subtitle: t(
        'Ask for them before you buy; we send copies with the price list.',
        'پیش از خرید آن‌ها را بخواهید؛ نسخه‌ای را همراه لیست قیمت می‌فرستیم.',
      )(l),
      variant: 'raised',
      columns: '3',
      items: [
        [t('Halal certificate', 'گواهی حلال'), t('From the Islamic body supervising the plant.', 'از نهاد اسلامی ناظر بر کشتارگاه.')],
        [
          t('Health certificate', 'گواهی بهداشت'),
          t('From the veterinary authority of the exporting country.', 'از مرجع دامپزشکی کشور صادرکننده.'),
        ],
        [t('Certificate of origin', 'گواهی مبدأ'), t('Where the meat was produced and packed.', 'محل تولید و بسته‌بندی گوشت.')],
        [
          t('Veterinary release', 'مجوز ترخیص دامپزشکی'),
          t('Iran’s veterinary organisation, after inspection.', 'از سازمان دامپزشکی ایران، پس از بازرسی.'),
        ],
        [t('Temperature log', 'گزارش دما'), t('The container’s temperature for the whole voyage.', 'دمای کانتینر در تمام مدت سفر.')],
        [
          t('Invoice and packing list', 'فاکتور و لیست بسته‌بندی'),
          t('Net weight, cuts and dates of every carton.', 'وزن خالص، نوع برش و تاریخ هر کارتن.'),
        ],
      ].map(([title, text]) => ({ image: '', title: title(l), text: text(l), link: '' })),
    },
  }),
};

/** Where each extra section goes: before the block with that id. */
const EXTRA_BEFORE = {
  steps: ['meat'],
  origin: ['journey'],
  story: ['gallery'],
  cuts: ['buy'],
  quotes: ['documents'],
};
const withExtra = (l) => blocks(l).flatMap((b) => [...(EXTRA_BEFORE[b.id] ?? []).map((k) => extra[k](l)), b]);

// Red, as in the logo: the second color (the soft half of the titles) a lighter red, the dark panels a deep maroon.
const theme = {
  primary: RED,
  secondary: '#e8717f',
  dark: '#2a0e15',
  background: '#faf3ef',
  surface: '#ffffff',
  text: '#1f1114',
  muted: '#7a6266',
  radius: '1.5rem',
  buttonRadius: '0.25rem',
  fontFa: 'Vazirmatn',
  fontEn: 'Manrope',
  headerStyle: 'solid',
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
      { href: '#cold-chain', label: { fa: 'زنجیره‌ی سرما', en: 'Cold chain' } },
      { href: '#story', label: { fa: 'درباره‌ی ما', en: 'About' } },
      { href: '#cuts', label: { fa: 'برش‌ها', en: 'Cuts' } },
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
  blocks: withExtra,
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
