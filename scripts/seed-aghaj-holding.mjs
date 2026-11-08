/**
 * Builds the Aghaj Investment Holding site (هلدینگ سرمایه‌گذاری آغاج) in Persian and English: a Tehran investment
 * company that helps people invest in real estate and in importing basic goods (frozen meat from Brazil and other
 * countries, sugar, rice…), with business consulting as its key strength. Gostaresh Protein Setareh Shargh, its frozen
 * meat importer, has a site of its own (seed-setareh-shargh.mjs) and the two link to each other.
 *
 * The photos are real, freely licensed pictures from Wikimedia Commons kept in scripts/aghaj-holding/ (fetched with
 * fetch-commons-photos.mjs), each credited on a "Photo credits" page. They show Tehran, its property market and the
 * trade in general, not Aghaj's own projects, offices or people.
 *
 *   node scripts/seed-aghaj-holding.mjs           a separate page at /fa/هلدینگ-آغاج and /en/aghaj-holding
 *   node scripts/seed-aghaj-holding.mjs --home    fills the home page and sets the site name, logo, menu and colors
 *   PREVIEW=aghaj node scripts/seed-aghaj-holding.mjs
 *                                                 the preview site <PREVIEW_URL>/preview/aghaj, filled as with --home
 *
 * Also: CONTACT_EMAIL, CONTACT_PHONE (shown in the footer and the business details when given) and PROTEIN_URL (the
 * Setareh Shargh site; on a preview it defaults to <PREVIEW_URL>/preview/setareh-shargh/). See preview-seed-lib.mjs
 * for the connection settings and DEPLOY.md, "Aghaj Holding and Setareh Shargh", for running it on the server.
 */
import { fileURLToPath } from 'node:url';
import { connect, creditBlocks, faDigits, loadSharp, publishPage, t, uploadPhotos } from './preview-seed-lib.mjs';

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

/**
 * The logo mark: a tree ("aghaj" is a tree) in gold, on a transparent background so the glass header can turn it
 * white over the photo.
 */
async function logo() {
  const crown = [
    [80, 54, 32],
    [50, 74, 25],
    [110, 74, 25],
    [64, 40, 22],
    [96, 40, 22],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><g fill="#b08d57">${crown}
    <path d="M 72 150 L 74 92 L 86 92 L 88 150 Z"/><rect x="44" y="146" width="72" height="8" rx="4"/></g>
    <path d="M 80 118 L 80 78 M 80 96 L 62 80 M 80 90 L 98 74" stroke="#f4f1ea" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
  return loadSharp()(Buffer.from(svg)).png().toBuffer();
}

const blocks = (l) => [
  {
    id: 'hero',
    type: 'spotlight',
    props: {
      people: [
        [
          t('Aghaj Holding', 'هلدینگ آغاج'),
          t('Invest with people who know the market', 'سرمایه‌گذاری با کسانی که بازار را می‌شناسند'),
          t(
            'An investment holding in Tehran. We help you put your capital into real estate and into importing basic goods, and we advise you at every step.',
            'هلدینگ سرمایه‌گذاری در تهران. کمک می‌کنیم سرمایه‌تان را در املاک و واردات کالاهای اساسی به کار بیندازید و در هر قدم کنارتان مشاوره می‌دهیم.',
          ),
          img.hero,
          '#c9a45c',
          t('Book a consultation', 'رزرو جلسه‌ی مشاوره'),
          '#contact',
        ],
        [
          t('Real estate', 'املاک'),
          t('Property you have checked twice', 'ملکی که دو بار بررسی شده'),
          t(
            'Residential and commercial projects in Tehran, chosen and checked by us: the deed, the builder, the permits and the price.',
            'پروژه‌های مسکونی و تجاری در تهران که ما انتخاب و بررسی کرده‌ایم: سند، سازنده، پروانه و قیمت.',
          ),
          img.cranes,
          '#8a6a3b',
          t('Property investing', 'سرمایه‌گذاری در ملک'),
          '#real-estate',
        ],
        [
          t('Basic goods', 'کالاهای اساسی'),
          t('Imports people need every day', 'وارداتی که مردم هر روز به آن نیاز دارند'),
          t(
            'Frozen meat from Brazil and other countries, sugar, rice and more: take part in import shipments with a team that runs them from order to warehouse.',
            'گوشت منجمد از برزیل و کشورهای دیگر، شکر، برنج و کالاهای دیگر: در محموله‌های وارداتی شریک شوید، با تیمی که از ثبت سفارش تا انبار آن‌ها را پیش می‌برد.',
          ),
          img.port,
          '#3d6a8c',
          t('What we import', 'آنچه وارد می‌کنیم'),
          '#imports',
        ],
        [
          t('Consulting', 'مشاوره'),
          t('Our key strength', 'قدرت اصلی ما'),
          t(
            'Before any money moves, we sit down with you: what you have, what you want, and the honest way there. Many clients come for the advice alone.',
            'پیش از جابه‌جا شدن هر ریالی، با شما می‌نشینیم: چه دارید، چه می‌خواهید و راه درست رسیدن به آن. بسیاری از مشتریان فقط برای مشاوره می‌آیند.',
          ),
          img.meeting,
          '#b08d57',
          t('Talk to an advisor', 'گفت‌وگو با مشاور'),
          '#consulting',
        ],
      ].map(([name, headline, text, photo, color, buttonLabel, buttonLink]) => ({
        name: name(l),
        headline: headline(l),
        text: text(l),
        photo,
        mobilePhoto: '',
        cardPhoto: '',
        cardLogo: '',
        color,
        buttonLabel: buttonLabel(l),
        buttonLink,
      })),
      marquee: t('CONSULTING IS OUR KEY POWER · REAL ESTATE · BASIC GOODS · ', 'مشاوره قدرت اصلی ماست · املاک · کالاهای اساسی · ')(l),
      // Text on the reading side; the skyline works either way.
      textSide: l === 'fa' ? 'right' : 'left',
      scrollHint: true,
    },
  },
  {
    id: 'numbers',
    type: 'counters',
    props: {
      title: t('One holding, one advisor for you', 'یک هلدینگ، یک مشاور برای شما')(l),
      items: [
        [3, '', t('Lines of business', 'حوزه‌ی کاری')],
        [2, '', t('Companies in the group', 'شرکت در گروه')],
        [4, '', t('Steps from meeting to investing', 'قدم از جلسه تا سرمایه‌گذاری')],
        [1, '', t('Advisor who knows your file', 'مشاوری که پرونده‌ی شما را می‌شناسد')],
      ].map(([value, suffix, label]) => ({ value, prefix: '', suffix, label: label(l) })),
    },
  },
  {
    id: 'lines',
    type: 'expanding-panels',
    props: {
      anchor: 'what-we-do',
      title: t('Where your capital can work', 'سرمایه‌ی شما کجا می‌تواند کار کند')(l),
      panels: [
        [
          img.towers,
          t('Residential property', 'املاک مسکونی'),
          t(
            'Apartments in established and growing parts of Tehran, bought finished or in partnership with builders.',
            'آپارتمان در محله‌های جاافتاده و رو به رشد تهران؛ آماده یا با مشارکت در ساخت.',
          ),
          '#real-estate',
        ],
        [
          img.mall,
          t('Commercial property', 'املاک تجاری'),
          t(
            'Shops and offices in busy commercial complexes, for steady rent.',
            'مغازه و دفتر در مجتمع‌های تجاری پررفت‌وآمد، برای اجاره‌ای پایدار.',
          ),
          '#real-estate',
        ],
        [
          img.beef,
          t('Frozen meat imports', 'واردات گوشت منجمد'),
          t(
            'Beef, lamb and chicken from Brazil and other countries, through our own importer, Setareh Shargh.',
            'گوشت گوساله، گوسفند و مرغ از برزیل و کشورهای دیگر، از طریق شرکت واردکننده‌ی خودمان، ستاره شرق.',
          ),
          protein(l),
        ],
        [
          img.sugar,
          t('Other basic goods', 'سایر کالاهای اساسی'),
          t(
            'Sugar, rice and other staples, bought in bulk and sold on to wholesalers.',
            'شکر، برنج و سایر اقلام اساسی؛ خرید عمده و فروش به عمده‌فروشان.',
          ),
          '#imports',
        ],
        [
          img.meeting,
          t('Business consulting', 'مشاوره‌ی کسب‌وکار'),
          t('Plans, feasibility studies and a second opinion before you decide.', 'برنامه، طرح توجیهی و نظر دوم پیش از تصمیم شما.'),
          '#consulting',
        ],
      ].map(([image, title, text, link]) => ({ image, title: title(l), text: text(l), link })),
    },
  },
  {
    id: 'consulting',
    type: 'image-text',
    props: {
      anchor: 'consulting',
      title: t('Consulting comes first. It is our key strength.', 'اول مشاوره. قدرت اصلی ما همین است.')(l),
      text: t(
        'Every client starts with a conversation, not a contract. We look at your capital, your time and the risk you can live with, then tell you plainly which of our paths fits, or that none does yet. Business owners also come to us for a plan to grow, a feasibility study for a new line, or a check on a deal someone else offered them.',
        'هر مشتری با یک گفت‌وگو شروع می‌کند، نه با قرارداد. سرمایه، زمان و ریسکی را که می‌پذیرید بررسی می‌کنیم و صریح می‌گوییم کدام مسیر ما به کارتان می‌آید، یا اینکه هنوز هیچ‌کدام. صاحبان کسب‌وکار هم برای برنامه‌ی رشد، طرح توجیهی یک خط کاری تازه یا بررسی معامله‌ای که دیگران پیشنهاد داده‌اند، سراغ ما می‌آیند.',
      )(l),
      image: img.table,
      imageSide: 'start',
      buttonLabel: t('Book a consultation', 'رزرو جلسه‌ی مشاوره')(l),
      buttonLink: '#contact',
    },
  },
  {
    id: 'real-estate',
    type: 'stacking-cards',
    props: {
      anchor: 'real-estate',
      title: t('Investing in real estate, with us', 'سرمایه‌گذاری در املاک، همراه ما')(l),
      cards: [
        [
          img.residential,
          t('01 · Choose', '۰۱ · انتخاب'),
          t('Projects we would buy ourselves', 'پروژه‌هایی که خودمان هم می‌خریم'),
          t(
            'We follow the Tehran market every week and bring you a short list that fits your budget, from finished apartments to projects under construction.',
            'بازار تهران را هر هفته دنبال می‌کنیم و فهرستی کوتاه و متناسب با بودجه‌تان می‌آوریم؛ از آپارتمان آماده تا پروژه‌ی در حال ساخت.',
          ),
          '#1d2b44',
        ],
        [
          img.construction,
          t('02 · Check', '۰۲ · بررسی'),
          t('Deed, permits and builder', 'سند، پروانه و سازنده'),
          t(
            'Our lawyers check the title deed and the building permit, and we look at what the builder has delivered before. Pre-sales get extra care.',
            'وکلای ما سند و پروانه‌ی ساخت را بررسی می‌کنند و کارهای قبلی سازنده را می‌بینیم. پیش‌فروش‌ها دقت بیشتری می‌گیرند.',
          ),
          '#2e3b52',
        ],
        [
          img.district,
          t('03 · Partner', '۰۳ · مشارکت'),
          t('Partnership in construction', 'مشارکت در ساخت'),
          t(
            'Landowners and investors can join a building project through us, with a clear contract for each side’s share and the timetable.',
            'مالکان زمین و سرمایه‌گذاران می‌توانند از طریق ما در یک پروژه‌ی ساختمانی شریک شوند؛ با قراردادی روشن برای سهم هر طرف و زمان‌بندی.',
          ),
          '#3a3326',
        ],
        [
          img.interior,
          t('04 · Keep', '۰۴ · نگهداری'),
          t('Rent, manage, or sell well', 'اجاره، مدیریت یا فروش درست'),
          t(
            'After the purchase we can find tenants, look after the property, and tell you when the time is right to sell.',
            'پس از خرید، می‌توانیم مستأجر پیدا کنیم، ملک را نگهداری کنیم و بگوییم چه زمانی برای فروش مناسب است.',
          ),
          '#5b4a2c',
        ],
      ].map(([image, eyebrow, title, text, color], i, all) => ({
        image,
        eyebrow: eyebrow(l),
        title: title(l),
        text: text(l),
        color,
        buttonLabel: i === all.length - 1 ? t('Ask about a property', 'درباره‌ی یک ملک بپرسید')(l) : '',
        buttonLink: i === all.length - 1 ? '#contact' : '',
      })),
    },
  },
  {
    id: 'imports',
    type: 'card-grid',
    props: {
      anchor: 'imports',
      title: t('Importing basic goods', 'واردات کالاهای اساسی')(l),
      subtitle: t(
        'We import what people buy every day, so demand does not depend on fashion. Investors can take a share of a shipment; we handle the order registration, payment, shipping, customs and storage.',
        'کالاهایی را وارد می‌کنیم که مردم هر روز می‌خرند، پس تقاضا به مُد بستگی ندارد. سرمایه‌گذاران می‌توانند در یک محموله سهم داشته باشند؛ ثبت سفارش، پرداخت، حمل، ترخیص و انبارداری با ماست.',
      )(l),
      variant: 'photo',
      columns: '3',
      items: [
        [
          img.cattle,
          t('Frozen beef', 'گوشت گوساله‌ی منجمد'),
          t('From Brazilian farms, halal slaughtered and frozen at origin.', 'از مزارع برزیل، ذبح اسلامی و منجمد در مبدأ.'),
          protein(l),
        ],
        [
          img.beef,
          t('Lamb and chicken', 'گوشت گوسفند و مرغ'),
          t('Whole and cut, for wholesalers, restaurants and stores.', 'کامل و قطعه‌بندی‌شده، برای عمده‌فروشان، رستوران‌ها و فروشگاه‌ها.'),
          protein(l),
        ],
        [img.sugar, t('Sugar', 'شکر'), t('Raw and white sugar in bulk.', 'شکر خام و سفید به‌صورت عمده.'), '#contact'],
        [
          img.rice,
          t('Rice', 'برنج'),
          t('Imported rice alongside the rice of Gilan and Mazandaran.', 'برنج وارداتی در کنار برنج گیلان و مازندران.'),
          '#contact',
        ],
        [
          img.port,
          t('Shipping and customs', 'حمل و ترخیص'),
          t('Through Bandar Abbas, with the paperwork handled for you.', 'از بندرعباس، با انجام همه‌ی کارهای اداری.'),
          '#steps',
        ],
        [
          img.warehouse,
          t('Storage and sale', 'انبار و فروش'),
          t('Bonded and cold storage until the goods are sold.', 'انبار عمومی و سردخانه تا زمان فروش کالا.'),
          '#steps',
        ],
      ].map(([image, title, text, link]) => ({ image, title: title(l), text: text(l), link })),
    },
  },
  {
    id: 'statement',
    type: 'statement',
    props: {
      title: t('From a farm in Brazil to a market in Tehran.', 'از مزرعه‌ای در برزیل تا بازاری در تهران.')(l),
      text: t(
        'A shipment of frozen meat crosses an ocean, a port and a customs house before it reaches a butcher’s shop. We know each of those steps, and the people in them.',
        'یک محموله‌ی گوشت منجمد از اقیانوس، بندر و گمرک می‌گذرد تا به قصابی برسد. ما تک‌تک این مراحل و آدم‌هایش را می‌شناسیم.',
      )(l),
      image: img.bazaarTrade,
      fixedImage: true,
      buttonLabel: t('Meet our importer', 'آشنایی با شرکت واردکننده‌ی ما')(l),
      buttonLink: protein(l),
    },
  },
  {
    id: 'steps',
    type: 'timeline',
    props: {
      anchor: 'steps',
      title: t('How investing with Aghaj works', 'سرمایه‌گذاری با آغاج چطور پیش می‌رود')(l),
      items: [
        [
          t('Step 1', 'قدم ۱'),
          t('A first meeting', 'جلسه‌ی اول'),
          t('Free and without obligation: your goals, your budget, your questions.', 'رایگان و بدون تعهد: هدف‌ها، بودجه و پرسش‌های شما.'),
        ],
        [
          t('Step 2', 'قدم ۲'),
          t('A written proposal', 'پیشنهاد مکتوب'),
          t(
            'The options that fit you, with the numbers, the risks and the timetable on paper.',
            'گزینه‌های متناسب با شما، با ارقام، ریسک‌ها و زمان‌بندی روی کاغذ.',
          ),
        ],
        [
          t('Step 3', 'قدم ۳'),
          t('A clear contract', 'قرارداد روشن'),
          t(
            'Who puts in what, who owns what, and how and when you get it back.',
            'چه کسی چه می‌گذارد، چه کسی مالک چیست و سود و اصل سرمایه چطور و کی برمی‌گردد.',
          ),
        ],
        [
          t('Step 4', 'قدم ۴'),
          t('Reports until the end', 'گزارش تا پایان کار'),
          t(
            'Regular updates with photos and documents, until the property is delivered or the shipment is sold.',
            'گزارش منظم با عکس و مدرک، تا تحویل ملک یا فروش محموله.',
          ),
        ],
      ].map(([date, title, text]) => ({ date: date(l), title: title(l), text: text(l) })),
    },
  },
  {
    id: 'group',
    type: 'image-text',
    props: {
      anchor: 'group',
      title: t('In the group: Gostaresh Protein Setareh Shargh', 'در گروه ما: گسترش پروتئین ستاره شرق')(l),
      text: t(
        'Our meat importer brings frozen beef, lamb and chicken from Brazil and other countries to Iran, keeps it at −18 °C from the ship to the store, and sells to wholesalers, restaurants and chain stores. It is managed by Aghaj Holding and has its own site.',
        'شرکت واردکننده‌ی گوشت ما، گوشت منجمد گوساله، گوسفند و مرغ را از برزیل و کشورهای دیگر به ایران می‌آورد، از کشتی تا فروشگاه در دمای ۱۸- درجه نگه می‌دارد و به عمده‌فروشان، رستوران‌ها و فروشگاه‌های زنجیره‌ای می‌فروشد. مدیریت آن با هلدینگ آغاج است و سایت جداگانه‌ی خودش را دارد.',
      )(l),
      image: img.cattle,
      imageSide: 'end',
      buttonLabel: t('Visit Setareh Shargh', 'رفتن به سایت ستاره شرق')(l),
      buttonLink: protein(l),
    },
  },
  {
    id: 'quotes',
    type: 'testimonials',
    props: {
      title: t('What clients say', 'مشتریان چه می‌گویند')(l),
      items: [
        [
          t(
            'I came to buy an apartment and left with a better idea: a share in a building project two streets away. They checked everything before I signed.',
            'برای خرید آپارتمان آمدم و با ایده‌ی بهتری برگشتم: سهمی در یک پروژه‌ی ساختمانی دو خیابان آن‌طرف‌تر. پیش از امضا همه‌چیز را بررسی کردند.',
          ),
          t('Reza A.', 'رضا ا.'),
          t('Real estate investor', 'سرمایه‌گذار ملک'),
        ],
        [
          t(
            'We had never imported anything. They walked us through one shipment of frozen beef, from the order to the cold store, and explained every invoice.',
            'هیچ‌وقت چیزی وارد نکرده بودیم. یک محموله‌ی گوشت منجمد را از ثبت سفارش تا سردخانه همراهمان پیش بردند و تک‌تک فاکتورها را توضیح دادند.',
          ),
          t('Maryam S.', 'مریم س.'),
          t('Partner in an import shipment', 'شریک یک محموله‌ی وارداتی'),
        ],
        [
          t(
            'The best advice I got was not to do a deal I was excited about. A year later I am glad I listened.',
            'بهترین توصیه‌ای که گرفتم این بود که معامله‌ای را که برایش هیجان داشتم انجام ندهم. یک سال بعد خوشحالم که گوش دادم.',
          ),
          t('Hamid K.', 'حمید ک.'),
          t('Business owner', 'صاحب کسب‌وکار'),
        ],
      ].map(([quote, name, role]) => ({ quote: quote(l), name: name(l), role: role(l), photo: '' })),
      seconds: 7,
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
          t(
            'Yes. The first meeting is free and you are not committed to anything.',
            'بله. جلسه‌ی اول رایگان است و هیچ تعهدی برای شما ندارد.',
          ),
        ],
        [
          t('How much do I need to start?', 'برای شروع چقدر سرمایه لازم است؟'),
          t(
            'It depends on the path. A share in an import shipment or a building partnership can start lower than buying a whole property. Tell us your budget and we will tell you what is realistic.',
            'به مسیر بستگی دارد. سهم در یک محموله‌ی وارداتی یا مشارکت در ساخت می‌تواند با سرمایه‌ای کمتر از خرید یک ملک کامل شروع شود. بودجه‌تان را بگویید تا بگوییم چه چیزی واقع‌بینانه است.',
          ),
        ],
        [
          t('Do you promise a fixed return?', 'سود ثابت تضمین می‌کنید؟'),
          t(
            'No honest investor can. We show you the numbers of similar past deals and the risks, and we write down exactly how profit and loss are shared.',
            'هیچ سرمایه‌گذار صادقی نمی‌تواند. ارقام معامله‌های مشابه قبلی و ریسک‌ها را نشانتان می‌دهیم و دقیق می‌نویسیم سود و زیان چطور تقسیم می‌شود.',
          ),
        ],
        [
          t('Who checks the documents of a property?', 'مدارک ملک را چه کسی بررسی می‌کند؟'),
          t(
            'Our own lawyers check the title deed, the permits and the contract before you sign.',
            'وکلای خود ما پیش از امضا، سند، پروانه‌ها و قرارداد را بررسی می‌کنند.',
          ),
        ],
        [
          t('Can I visit you?', 'می‌توانم حضوری مراجعه کنم؟'),
          t(
            'Yes, at our office in Tehran, by appointment. Use the form below and we will call you.',
            'بله، در دفتر ما در تهران و با هماهنگی قبلی. فرم زیر را پر کنید تا با شما تماس بگیریم.',
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
      title: t('Book a consultation', 'رزرو جلسه‌ی مشاوره')(l),
      text: t(
        'Tell us a little about what you have in mind. An advisor will call you within one working day.',
        'کمی از برنامه‌تان بگویید. ظرف یک روز کاری یکی از مشاوران با شما تماس می‌گیرد.',
      )(l),
      fields: [
        { label: t('Name', 'نام و نام خانوادگی')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Mobile', 'تلفن همراه')(l), type: 'tel', required: true, options: '', placeholder: t('09…', '۰۹…')(l) },
        { label: t('Email', 'ایمیل')(l), type: 'email', required: false, options: '', placeholder: '' },
        {
          label: t('Interested in', 'زمینه‌ی مورد نظر')(l),
          type: 'select',
          required: true,
          options: t(
            'Real estate, Importing basic goods, Business consulting, Not sure yet',
            'املاک, واردات کالاهای اساسی, مشاوره‌ی کسب‌وکار, هنوز نمی‌دانم',
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
    id: 'closing',
    type: 'photo-cta',
    props: {
      eyebrow: t('Aghaj Investment Holding', 'هلدینگ سرمایه‌گذاری آغاج')(l),
      title: t('Your capital,', 'سرمایه‌ی شما،')(l),
      titleItalic: t('with a plan.', 'با برنامه.')(l),
      text: t(
        'Start with one conversation. We will tell you honestly where your money can work, and where it should not.',
        'با یک گفت‌وگو شروع کنید. صادقانه می‌گوییم سرمایه‌تان کجا می‌تواند کار کند و کجا نباید.',
      )(l),
      image: img.skyline,
      stats: [
        [t('Free', 'رایگان'), t('First meeting', 'جلسه‌ی اول')],
        [t('3', '۳'), t('Lines of business', 'حوزه‌ی کاری')],
        [t('Tehran', 'تهران'), t('Head office', 'دفتر مرکزی')],
      ].map(([value, label]) => ({ value: value(l), label: label(l) })),
      buttonLabel: t('Book a consultation', 'رزرو جلسه‌ی مشاوره')(l),
      buttonLink: '#contact',
      columns: [
        [
          t('Real estate', 'املاک'),
          t('Residential, commercial, partnership', 'مسکونی، تجاری، مشارکت در ساخت'),
          t('Read more', 'بیشتر'),
          '#real-estate',
        ],
        [t('Basic goods', 'کالاهای اساسی'), t('Frozen meat, sugar, rice', 'گوشت منجمد، شکر، برنج'), t('Read more', 'بیشتر'), '#imports'],
        [t('Setareh Shargh', 'ستاره شرق'), t('Our frozen meat importer', 'شرکت واردکننده‌ی گوشت ما'), t('Visit', 'رفتن به سایت'), protein],
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
  {
    id: 'footer',
    type: 'contact-footer',
    props: {
      title: t('Aghaj Investment Holding', 'هلدینگ سرمایه‌گذاری آغاج')(l),
      text: t(
        'Real estate, basic-goods imports and business consulting. Group company: Gostaresh Protein Setareh Shargh.',
        'املاک، واردات کالاهای اساسی و مشاوره‌ی کسب‌وکار. شرکت گروه: گسترش پروتئین ستاره شرق.',
      )(l),
      email: EMAIL,
      phone: l === 'fa' ? faDigits(PHONE) : PHONE,
      address: t('Tehran, Iran', 'تهران، ایران')(l),
      copyright: t(`© ${new Date().getFullYear()} Aghaj Holding`, `© ${faDigits(1405)} هلدینگ آغاج`)(l),
    },
  },
];

const theme = {
  primary: '#b08d57',
  secondary: '#d9c294',
  dark: '#0f1b2d',
  background: '#f4f1ea',
  surface: '#ffffff',
  text: '#131b28',
  muted: '#6b7280',
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
    logo: (await ctx.upload(await logo(), 'aghaj-logo.png', 'image/png')).url,
    theme: { ...settings.theme, ...theme },
    defaultLocale: 'fa',
    menu: [
      { href: '#what-we-do', label: { fa: 'حوزه‌ها', en: 'What we do' } },
      { href: '#consulting', label: { fa: 'مشاوره', en: 'Consulting' } },
      { href: '#real-estate', label: { fa: 'املاک', en: 'Real estate' } },
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
      seoTitle: 'هلدینگ سرمایه‌گذاری آغاج | املاک، واردات کالاهای اساسی و مشاوره',
      seoDescription:
        'هلدینگ آغاج در تهران به شما کمک می‌کند در املاک و واردات کالاهای اساسی مانند گوشت منجمد برزیلی سرمایه‌گذاری کنید. مشاوره‌ی کسب‌وکار قدرت اصلی ماست.',
    },
    en: {
      seoTitle: 'Aghaj Investment Holding | Real estate, basic-goods imports and consulting',
      seoDescription:
        'Aghaj Holding in Tehran helps you invest in real estate and in importing basic goods such as frozen meat from Brazil. Business consulting is our key strength.',
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
        'The photos on this site are freely licensed pictures from Wikimedia Commons, chosen to show Tehran, its property market and the trade in basic goods. They are not photos of Aghaj Holding’s own projects, offices, shipments or people. Each one links to its page and original file on Commons, with its author and license.',
        'عکس‌های این سایت تصاویری با مجوز آزاد از ویکی‌انبار (Wikimedia Commons) هستند که برای نشان دادن تهران، بازار ملک و تجارت کالاهای اساسی انتخاب شده‌اند. این‌ها عکس پروژه‌ها، دفاتر، محموله‌ها یا کارکنان هلدینگ آغاج نیستند. هر عکس به صفحه و فایل اصلی‌اش در ویکی‌انبار، با نام پدیدآورنده و مجوزش، پیوند دارد.',
      ),
    ),
});
