/**
 * Builds the Gostaresh Protein Setareh Shargh site (گسترش پروتئین ستاره شرق) in Persian and English: a Tehran company
 * that imports frozen beef, lamb and chicken from Brazil and other countries into Iran and sells it to wholesalers,
 * restaurants and stores. It is managed by Aghaj Investment Holding (seed-aghaj-holding.mjs); the two sites link to
 * each other but are separate sites.
 *
 * It uses the Atelier blocks (photo hero, showroom shelf, step cards, story tabs, capability cards, a library of cuts,
 * fanned quotes, the real place and a photo call to action) in cold, ice-blue colors with a meat-red accent. The photos
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
import { connect, creditBlocks, faDigits, loadSharp, publishPage, t, uploadPhotos } from './preview-seed-lib.mjs';

const ctx = await connect({
  name: 'Setareh Shargh Protein',
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

/** The logo mark: an eight-pointed star ("setareh shargh" is the star of the east) in meat red. */
async function logo() {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? 30 : 64;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    return `${80 + r * Math.cos(a)},${80 + r * Math.sin(a)}`;
  }).join(' ');
  // Transparent around the star, so a header over a photo can turn it white.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><polygon points="${pts}" fill="#b4232c"/></svg>`;
  return loadSharp()(Buffer.from(svg)).png().toBuffer();
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

const theme = {
  primary: '#b4232c',
  secondary: '#5b8db8',
  dark: '#0d1b26',
  background: '#eef3f6',
  surface: '#ffffff',
  text: '#0e1720',
  muted: '#5f6f7c',
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
  await ctx.api('PUT', '/admin/settings', {
    siteName: { fa: 'ستاره شرق', en: 'Setareh Shargh' },
    logo: (await ctx.upload(await logo(), 'setareh-shargh-logo.png', 'image/png')).url,
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
      seoTitle: 'واردات گوشت منجمد گوساله، گوسفند و مرغ از برزیل | ستاره شرق',
      seoDescription:
        'گسترش پروتئین ستاره شرق، از شرکت‌های هلدینگ آغاج، گوشت منجمد حلال گوساله، گوسفند و مرغ را از برزیل و کشورهای دیگر وارد می‌کند و به سراسر ایران می‌فروشد.',
    },
    en: {
      seoTitle: 'Frozen beef, lamb and chicken imported from Brazil | Setareh Shargh',
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
  titles: { fa: 'اعتبار عکس‌ها — ستاره شرق', en: 'Photo credits — Setareh Shargh' },
  blocks: (l) =>
    creditBlocks(
      l,
      credits,
      t(
        'The photos on this site are freely licensed pictures from Wikimedia Commons, chosen to show the meat trade: cattle and poultry in Brazil, ports, refrigerated containers, cuts of meat and Persian dishes. They are not photos of Setareh Shargh’s own products, shipments, stores or people. Each one links to its page and original file on Commons, with its author and license.',
        'عکس‌های این سایت تصاویری با مجوز آزاد از ویکی‌انبار (Wikimedia Commons) هستند که برای نشان دادن تجارت گوشت انتخاب شده‌اند: دام و طیور در برزیل، بندرها، کانتینرهای یخچال‌دار، برش‌های گوشت و غذاهای ایرانی. این‌ها عکس محصولات، محموله‌ها، فروشگاه‌ها یا کارکنان ستاره شرق نیستند. هر عکس به صفحه و فایل اصلی‌اش در ویکی‌انبار، با نام پدیدآورنده و مجوزش، پیوند دارد.',
      ),
    ),
});
