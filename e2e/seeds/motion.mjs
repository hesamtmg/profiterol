// Builds a "Motion" page with the animated blocks (and entrance animations on others), with generated pictures.
import { API, apiToken, logo, photo, upload } from '../lib.mjs';

const token = await apiToken();
const auth = { authorization: `Bearer ${token}` };
const PALETTE = [
  ['#0f4c5c', '#00a998'],
  ['#3d2c1e', '#c49a6c'],
  ['#1d3557', '#a8dadc'],
  ['#264653', '#e9c46a'],
  ['#5f0f40', '#fb8b24'],
  ['#22223b', '#9a8c98'],
  ['#283618', '#dda15e'],
  ['#003049', '#f77f00'],
  ['#2b2d42', '#8d99ae'],
  ['#3a0ca3', '#4cc9f0'],
  ['#6a040f', '#ffba08'],
  ['#1b4332', '#95d5b2'],
  ['#432818', '#bb9457'],
  ['#10002b', '#c77dff'],
];
const shot = async (i) =>
  upload(token, await photo({ width: 1800, height: 1100, from: PALETTE[i][0], to: PALETTE[i][1] }), `photo-${i}.jpg`, 'image/jpeg');
const photos = [];
for (let i = 0; i < 7; i++) photos.push(await shot(i));
const logos = [];
for (const name of ['NORTH', 'Lumen', 'ATLAS', 'Kito', 'ORBIT', 'Pars'])
  logos.push(await upload(token, await logo(name, { color: '#64748b' }), `${name}.png`, 'image/png'));
const before = await upload(
  token,
  await photo({ width: 1800, height: 1100, from: '#9ca3af', to: '#e5e7eb', label: 'Before' }),
  'before.jpg',
  'image/jpeg',
);
const after = photos[0];

const t = (en, fa) => (l) => (l === 'en' ? en : fa);
const blocks = (l) => [
  {
    id: 'm1',
    type: 'aurora-hero',
    props: {
      eyebrow: t('Now booking projects for 2027', 'پذیرش پروژه برای ۱۴۰۶')(l),
      title: t('We craft', 'ما می‌سازیم')(l),
      words: t('websites, brands, experiences', 'وب‌سایت، برند، تجربه')(l),
      text: t('A small team making things that look good, load fast and feel alive.', 'تیمی کوچک که چیزهایی زیبا، سریع و زنده می‌سازد.')(l),
      buttonLabel: t('Start a project', 'شروع پروژه')(l),
      buttonLink: '#m7',
      secondButtonLabel: t('See our work', 'نمونه کارها')(l),
      secondButtonLink: '#m5',
      color: '#7c5cff',
      look: 'dark',
    },
  },
  {
    id: 'm2',
    type: 'logo-strip',
    props: {
      title: t('Trusted by', 'همراهان ما')(l),
      logos: logos.map((image, i) => ({ image, name: `Client ${i + 1}`, link: '' })),
      seconds: 25,
      twoRows: true,
      look: 'dark',
    },
  },
  {
    id: 'm3',
    type: 'scroll-text',
    props: {
      eyebrow: t('Our approach', 'رویکرد ما')(l),
      text: t(
        'We believe a website should feel like walking into a well designed room: calm, clear, and full of small surprises that make you want to stay a little longer.',
        'ما باور داریم یک وب‌سایت باید مثل ورود به اتاقی خوش‌طراحی باشد: آرام، روشن و پر از شگفتی‌های کوچکی که شما را بیشتر نگه می‌دارد.',
      )(l),
    },
  },
  {
    id: 'm4',
    type: 'counters',
    props: {
      animation: 'rise',
      title: t('In numbers', 'به زبان عدد')(l),
      items: [
        { value: 12, prefix: '', suffix: '+', label: t('Years of work', 'سال تجربه')(l) },
        { value: 340, prefix: '', suffix: '', label: t('Projects delivered', 'پروژه‌ی تحویل‌شده')(l) },
        { value: 98, prefix: '', suffix: '%', label: t('Happy clients', 'مشتری راضی')(l) },
        { value: 4.9, prefix: '', suffix: '★', label: t('Average rating', 'میانگین امتیاز')(l) },
      ],
    },
  },
  {
    id: 'm12',
    type: 'parallax',
    props: {
      title: t('Go further', 'دورتر بروید')(l),
      text: t('Every layer moves at its own pace.', 'هر لایه با سرعت خودش حرکت می‌کند.')(l),
      buttonLabel: t('Explore', 'کاوش')(l),
      buttonLink: '#m13',
      layers: [
        { image: '', speed: 'slow', fit: 'cover' },
        { image: '', speed: 'medium', fit: 'bottom' },
        { image: '', speed: 'fast', fit: 'bottom' },
      ],
      mouse: true,
      height: 'full',
    },
  },
  {
    id: 'm13',
    type: 'sticky-story',
    props: {
      title: t('How it works', 'روند کار')(l),
      imageSide: 'start',
      steps: [
        {
          image: photos[0],
          eyebrow: t('Step 1', 'گام ۱')(l),
          title: t('We listen', 'گوش می‌دهیم')(l),
          text: t(
            'A first call to understand who you are and what success looks like.',
            'یک تماس اول برای شناخت شما و اینکه موفقیت برایتان چیست.',
          )(l),
        },
        {
          image: photos[1],
          eyebrow: t('Step 2', 'گام ۲')(l),
          title: t('We sketch', 'طرح می‌زنیم')(l),
          text: t('Ideas on paper, then in the browser, shared with you every week.', 'ایده روی کاغذ، بعد در مرورگر، هر هفته با شما.')(l),
        },
        {
          image: photos[5],
          eyebrow: t('Step 3', 'گام ۳')(l),
          title: t('We build', 'می‌سازیم')(l),
          text: t(
            'Fast pages, easy editing, every detail checked on real phones.',
            'صفحه‌های سریع، ویرایش آسان، همه چیز روی گوشی واقعی آزموده.',
          )(l),
        },
        {
          image: photos[6],
          eyebrow: t('Step 4', 'گام ۴')(l),
          title: t('We launch', 'راه می‌اندازیم')(l),
          text: t('Go live, measure, and keep improving together.', 'انتشار، سنجش و بهتر شدن با هم.')(l),
        },
      ],
    },
  },
  {
    id: 'm5',
    type: 'horizontal-scroll',
    props: {
      title: t('Selected work', 'کارهای منتخب')(l),
      text: t('Keep scrolling: the projects slide past.', 'اسکرول کنید تا پروژه‌ها رد شوند.')(l),
      cards: photos.slice(0, 5).map((image, i) => ({
        image,
        tag: ['Brand', 'Website', 'App', 'Campaign', 'Website'][i],
        title: ['Northwind', 'Lumen Studio', 'Kite', 'Orbit Bikes', 'Harbor Hotel'][i],
        text: t('A short line about this project.', 'یک خط درباره‌ی این پروژه.')(l),
        link: '',
      })),
    },
  },
  {
    id: 'm6',
    type: 'tilt-cards',
    props: {
      animation: 'zoom',
      title: t('What we do', 'کار ما')(l),
      items: [
        {
          image: '',
          icon: 'mdi-palette-outline',
          title: t('Design', 'طراحی')(l),
          text: t('Interfaces people enjoy using.', 'رابط‌هایی که لذت استفاده دارند.')(l),
          link: '',
        },
        {
          image: '',
          icon: 'mdi-code-tags',
          title: t('Development', 'توسعه')(l),
          text: t('Fast, accessible, easy to edit.', 'سریع، در دسترس و آسان برای ویرایش.')(l),
          link: '',
        },
        {
          image: '',
          icon: 'mdi-rocket-launch-outline',
          title: t('Launch', 'راه‌اندازی')(l),
          text: t('Hosting, analytics and growth.', 'میزبانی، آمار و رشد.')(l),
          link: '',
        },
      ],
    },
  },
  {
    id: 'm7',
    type: 'flip-cards',
    props: {
      animation: 'flip',
      title: t('Meet the team', 'آشنایی با تیم')(l),
      items: [
        {
          image: photos[2],
          title: t('Sara, design', 'سارا، طراحی')(l),
          back: t('Loves typography, plants and very small details.', 'عاشق تایپوگرافی، گیاه و جزئیات ریز.')(l),
          buttonLabel: t('Say hi', 'سلام کنید')(l),
          buttonLink: '',
        },
        {
          image: photos[3],
          title: t('Omid, code', 'امید، کدنویسی')(l),
          back: t('Makes things fast. Has opinions about coffee.', 'همه چیز را سریع می‌کند. درباره‌ی قهوه نظر دارد.')(l),
          buttonLabel: t('Say hi', 'سلام کنید')(l),
          buttonLink: '',
        },
        {
          image: photos[4],
          title: t('Lena, projects', 'لنا، مدیریت پروژه')(l),
          back: t('Keeps every launch on time and every client calm.', 'هر پروژه را به‌موقع و هر مشتری را آرام نگه می‌دارد.')(l),
          buttonLabel: t('Say hi', 'سلام کنید')(l),
          buttonLink: '',
        },
      ],
    },
  },
  {
    id: 'm8',
    type: 'before-after',
    props: {
      animation: 'blur',
      title: t('The difference', 'تفاوت')(l),
      before,
      after,
      beforeLabel: t('Before', 'قبل')(l),
      afterLabel: t('After', 'بعد')(l),
    },
  },
  {
    id: 'm9',
    type: 'testimonials',
    props: {
      title: t('Kind words', 'حرف مشتری‌ها')(l),
      seconds: 6,
      items: [
        {
          quote: t(
            'They understood what we wanted before we could explain it. The new site doubled our bookings.',
            'قبل از اینکه توضیح بدهیم فهمیدند چه می‌خواهیم. سایت جدید رزروهای ما را دو برابر کرد.',
          )(l),
          name: 'Maryam K.',
          role: 'Harbor Hotel',
          photo: '',
        },
        {
          quote: t(
            'Fast, friendly and honest about what matters. We will work with them again.',
            'سریع، صمیمی و صادق درباره‌ی آنچه مهم است. باز هم با آن‌ها کار می‌کنیم.',
          )(l),
          name: 'Daniel R.',
          role: 'Kite',
          photo: '',
        },
        {
          quote: t(
            'Our customers keep telling us how good the shop feels to use.',
            'مشتری‌ها مدام می‌گویند کار با فروشگاه چقدر خوشایند است.',
          )(l),
          name: 'Nora S.',
          role: 'Northwind Coffee',
          photo: '',
        },
      ],
    },
  },
  {
    id: 'm10',
    type: 'timeline',
    props: {
      title: t('Our story', 'داستان ما')(l),
      items: [
        {
          date: '2012',
          title: t('Two people, one table', 'دو نفر، یک میز')(l),
          text: t('The studio starts in a spare room.', 'استودیو در یک اتاق کوچک شروع شد.')(l),
        },
        {
          date: '2016',
          title: t('First big client', 'اولین مشتری بزرگ')(l),
          text: t('A hotel group trusts us with all their sites.', 'یک گروه هتل همه‌ی سایت‌هایش را به ما سپرد.')(l),
        },
        {
          date: '2020',
          title: t('A team of twenty', 'تیمی بیست‌نفره')(l),
          text: t('New office, new crafts: video and motion.', 'دفتر تازه، مهارت‌های تازه: ویدئو و موشن.')(l),
        },
        {
          date: t('Today', 'امروز')(l),
          title: t('Still curious', 'هنوز کنجکاو')(l),
          text: t('Every project still starts with listening.', 'هر پروژه هنوز با شنیدن شروع می‌شود.')(l),
        },
      ],
    },
  },
  {
    id: 'm14',
    type: 'zoom-reveal',
    props: {
      eyebrow: t('New collection', 'مجموعه‌ی تازه')(l),
      title: t('Step inside', 'وارد شوید')(l),
      text: t('Scroll, and the picture opens up around you.', 'اسکرول کنید تا تصویر دورتان باز شود.')(l),
      buttonLabel: t('Take a look', 'نگاهی بیندازید')(l),
      buttonLink: '#m15',
      image: photos[2],
      intro: t('A closer look', 'نگاهی نزدیک‌تر')(l),
    },
  },
  {
    id: 'm15',
    type: 'stacking-cards',
    props: {
      title: t('What we offer', 'خدمات ما')(l),
      cards: [
        [t('Strategy', 'راهبرد')(l), '#0f172a'],
        [t('Design', 'طراحی')(l), '#1e3a8a'],
        [t('Build', 'ساخت')(l), '#4c1d95'],
        [t('Grow', 'رشد')(l), '#831843'],
      ].map(([title, color], i) => ({
        image: photos[i + 3],
        eyebrow: String(i + 1).padStart(2, '0'),
        title,
        text: t('A short line about this service.', 'یک خط درباره‌ی این خدمت.')(l),
        color,
        buttonLabel: '',
        buttonLink: '',
      })),
    },
  },
  {
    id: 'm16',
    type: 'scroll-marquee',
    props: {
      rows: [
        { text: t('Design · Build · Launch', 'طراحی · ساخت · انتشار')(l), style: 'solid' },
        { text: t('Brands that move', 'برندهایی که حرکت می‌کنند')(l), style: 'outline' },
        { text: t('Made with care', 'ساخته‌شده با دقت')(l), style: 'accent' },
      ],
      speed: 'medium',
      look: 'dark',
    },
  },
  {
    id: 'm17',
    type: 'split-reveal',
    props: {
      image: photos[0],
      coverTitle: t('Open up', 'باز کنید')(l),
      eyebrow: t('Behind the scenes', 'پشت صحنه')(l),
      title: t('Good work starts with a good question', 'کار خوب با یک پرسش خوب شروع می‌شود')(l),
      text: t('We ask a lot of them, so the answer ends up simple.', 'ما زیاد می‌پرسیم تا پاسخ ساده از آب درآید.')(l),
      buttonLabel: t('Ask us one', 'از ما بپرسید')(l),
      buttonLink: '#m11',
      direction: 'sideways',
    },
  },
  {
    id: 'm18',
    type: 'floating-gallery',
    props: {
      eyebrow: t('Gallery', 'گالری')(l),
      title: t('Moments from the studio', 'لحظه‌هایی از استودیو')(l),
      text: t('Some of what happens between the first sketch and the launch.', 'گوشه‌ای از آنچه میان اولین طرح و انتشار می‌گذرد.')(l),
      buttonLabel: t('See all projects', 'همه‌ی پروژه‌ها')(l),
      buttonLink: '#m5',
      photos: photos.slice(0, 6).map((image, i) => ({ image, caption: `${t('Photo', 'عکس')(l)} ${i + 1}` })),
    },
  },
  {
    id: 'm11',
    type: 'horizon',
    props: {
      animation: 'reveal',
      image: photos[1],
      mobileImage: '',
      blur: true,
      title: t('Ready when you are', 'هر وقت آماده بودید')(l),
      text: t('Tell us about your idea; we reply within a day.', 'ایده‌تان را بگویید؛ ظرف یک روز پاسخ می‌دهیم.')(l),
    },
  },
];

for (const old of await (await fetch(`${API}/admin/pages`, { headers: auth })).json()) {
  if (old.name === 'Motion') await fetch(`${API}/admin/pages/${old.id}`, { method: 'DELETE', headers: auth });
}
const withAnchors = (list) => list.map((b) => ({ ...b, props: { ...b.props, anchor: b.id } }));
const page = await (
  await fetch(`${API}/admin/pages`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Motion' }),
  })
).json();
const upd = await fetch(`${API}/admin/pages/${page.id}`, {
  method: 'PATCH',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({
    theme: { background: '#ffffff', cursor: 'ring', pageTransition: 'curtain' },
    translations: ['en', 'fa'].map((l) => ({ locale: l, title: t('Motion', 'حرکت')(l), slug: 'motion', blocks: withAnchors(blocks(l)) })),
  }),
});
console.log('update', upd.status, upd.ok ? '' : await upd.text());
console.log('publish', (await fetch(`${API}/admin/pages/${page.id}/publish`, { method: 'POST', headers: auth })).status);
