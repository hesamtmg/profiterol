// Builds a "Classic" page with all 12 minicms section kinds, with generated photos and a test video.
import { readFileSync } from 'node:fs';
import { API, apiToken, photo, testVideo, upload } from '../lib.mjs';

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
const shot = async (i, label = '', w = 1600, h = 1000) =>
  upload(
    token,
    await photo({ width: w, height: h, from: PALETTE[i % PALETTE.length][0], to: PALETTE[i % PALETTE.length][1], label }),
    `photo-${i}.jpg`,
    'image/jpeg',
  );
const clip = testVideo();
const video = clip ? await upload(token, readFileSync(clip), 'clip.webm', 'video/webm') : '';
const img = [];
for (let i = 0; i < 12; i++) img.push(await shot(i));
const big = [await shot(12, '', 2400, 1400), await shot(13, '', 2400, 1400)];

const t = (en, fa) => (l) => (l === 'en' ? en : fa);
const blocks = (l) => [
  {
    id: 'k1',
    type: 'video-cover',
    props: {
      video,
      mobileVideo: '',
      poster: img[0],
      title: t('Every project begins with a conversation', 'هر پروژه با یک گفتگو آغاز می‌شود')(l),
    },
  },
  {
    id: 'k2',
    type: 'triple',
    props: {
      title: t('Our services', 'خدمات ما')(l),
      items: [
        {
          image: img[1],
          mobileImage: '',
          title: t('Architecture', 'معماری')(l),
          text: t('Buildings designed around the people who use them.', 'ساختمان‌هایی که برای مردمش طراحی شده‌اند.')(l),
          link: '#k4',
        },
        {
          image: img[2],
          mobileImage: '',
          title: t('Interiors', 'طراحی داخلی')(l),
          text: t('Light, materials and detail in balance.', 'نور، متریال و جزئیات در تعادل.')(l),
          link: '#k5',
        },
        {
          image: img[3],
          mobileImage: '',
          title: t('Landscape', 'محوطه‌سازی')(l),
          text: t('Gardens that grow with the building.', 'باغ‌هایی که با ساختمان رشد می‌کنند.')(l),
          link: '',
        },
      ],
    },
  },
  {
    id: 'k3',
    type: 'horizon',
    props: {
      image: big[0],
      mobileImage: '',
      blur: true,
      title: t('Light, space and material', 'نور، فضا و متریال')(l),
      text: t(
        'A calm photo with a few words over it: the idea behind your work, in one breath.',
        'یک عکس آرام و چند کلمه روی آن: ایده‌ی پشت کار شما در یک نفس.',
      )(l),
    },
  },
  {
    id: 'k4',
    type: 'side-by-side',
    props: {
      image: img[4],
      mobileImage: '',
      imageSide: 'right',
      bigTitle: '12',
      smallTitle: t('Years experience', 'سال تجربه')(l),
      lines: [
        {
          text: t(
            'We started with small houses and grew into a studio that designs offices, hotels and public spaces across the country.',
            'با خانه‌های کوچک شروع کردیم و به استودیویی رسیدیم که دفتر، هتل و فضای عمومی در سراسر کشور طراحی می‌کند.',
          )(l),
        },
        {
          text: t(
            'Every project is led by the same people from the first sketch to the last site visit, so nothing gets lost on the way.',
            'هر پروژه از اولین طرح تا آخرین بازدید کارگاه با همان تیم پیش می‌رود تا چیزی در مسیر گم نشود.',
          )(l),
        },
      ],
      buttonLabel: t('About us', 'درباره ما')(l),
      buttonLink: '#k8',
    },
  },
  {
    id: 'k5',
    type: 'horizon-right',
    props: {
      image: img[5],
      mobileImage: '',
      title: t('Designed for daylight', 'طراحی برای نور روز')(l),
      text: t(
        'Tall windows and deep reveals bring soft light into every room through the whole day, without glare.',
        'پنجره‌های بلند و قاب‌های عمیق، نور نرم را در تمام روز و بدون خیرگی به هر اتاق می‌آورند.',
      )(l),
    },
  },
  {
    id: 'k6',
    type: 'horizon-left',
    props: {
      image: img[6],
      mobileImage: '',
      title: t('Built to last', 'ساخته شده برای ماندن')(l),
      text: t(
        'Honest materials, careful details and a plan that leaves room for the next generation.',
        'متریال صادق، جزئیات دقیق و پلانی که برای نسل بعد جا می‌گذارد.',
      )(l),
    },
  },
  {
    id: 'k7',
    type: 'contact-split',
    props: {
      image: img[7],
      title: t('Let’s talk about your project', 'بیایید درباره پروژه شما صحبت کنیم')(l),
      text: t(
        'Every project begins long before it becomes a drawing. It starts with a simple conversation.',
        'هر پروژه خیلی پیش از آنکه نقشه شود، با یک گفتگوی ساده آغاز می‌شود.',
      )(l),
      address: t('Tehran, Khaleghi Street, No. 6, Unit 3', 'تهران، خیابان خالقی، پلاک ۶، واحد ۳')(l),
      email: 'info@example.com',
      phone: '+98 21 0000 0000',
      fields: [
        { label: t('Name', 'نام')(l), type: 'text', required: true, options: '', placeholder: '' },
        { label: t('Email', 'ایمیل')(l), type: 'email', required: true, options: '', placeholder: 'you@example.com' },
        { label: t('Phone', 'تلفن')(l), type: 'tel', required: false, options: '', placeholder: '' },
        { label: t('Subject', 'موضوع')(l), type: 'text', required: false, options: '', placeholder: '' },
        { label: t('Message', 'پیام')(l), type: 'textarea', required: true, options: '', placeholder: '' },
      ],
      submitLabel: t('Send message', 'ارسال پیام')(l),
      successMessage: t('Thank you! We received your message.', 'ممنون! پیام شما رسید.')(l),
    },
  },
  {
    id: 'k8',
    type: 'information',
    props: {
      title: t('About the studio', 'درباره استودیو')(l),
      text: t('Who we are and how we work.', 'ما که هستیم و چطور کار می‌کنیم.')(l),
      title2: t('Our story', 'داستان ما')(l),
      subtitle2: t('Since 2012', 'از ۱۳۹۱')(l),
      body: t(
        'We began as two architects at one table.\n\nToday a team of twenty works on homes, offices and public places.\n\nWhat has not changed is how we start: by listening.',
        'ما با دو معمار پشت یک میز شروع کردیم.\n\nامروز تیمی بیست‌نفره روی خانه، دفتر و فضای عمومی کار می‌کند.\n\nآنچه تغییر نکرده، شروع کارمان است: گوش دادن.',
      )(l),
      image: img[8],
    },
  },
  {
    id: 'k9',
    type: 'rich-text',
    props: {
      html: t(
        '<h2>How we work</h2><p>Each project follows <strong>four steps</strong>, and you are part of every one:</p><ol><li>Listening</li><li>Concept</li><li>Design</li><li>Building</li></ol><blockquote>Good buildings start with good questions.</blockquote><p>Read more on <a href="https://example.com" target="_blank">our blog</a>.</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">bad link</a>',
        '<h2>روش کار ما</h2><p>هر پروژه <strong>چهار مرحله</strong> دارد و شما در همه‌ی آن‌ها همراه ما هستید:</p><ol><li>شنیدن</li><li>ایده</li><li>طراحی</li><li>ساخت</li></ol><blockquote>ساختمان خوب با پرسش خوب شروع می‌شود.</blockquote>',
      )(l),
    },
  },
  { id: 'k10', type: 'video-showcase', props: { video, poster: img[9], mobileVideo: '', mobilePoster: '' } },
  {
    id: 'k11',
    type: 'slider',
    props: {
      slides: [
        {
          image: big[1],
          mobileImage: '',
          title: t('Villa on the hill', 'ویلای روی تپه')(l),
          buttonLabel: t('View project', 'دیدن پروژه')(l),
          buttonLink: '#k12',
        },
        {
          image: img[10],
          mobileImage: '',
          title: t('Office by the park', 'دفتر کنار پارک')(l),
          buttonLabel: t('View project', 'دیدن پروژه')(l),
          buttonLink: '#k12',
        },
        { image: img[11], mobileImage: '', title: t('Courtyard house', 'خانه‌ی حیاط‌دار')(l), buttonLabel: '', buttonLink: '' },
      ],
      autoplay: true,
      seconds: 5,
    },
  },
  {
    id: 'k12',
    type: 'photo-grid',
    props: {
      size: '2*4',
      mobileSize: '4*2',
      items: img.slice(0, 8).map((image, i) => ({
        image,
        title: t(`Project ${i + 1}`, `پروژه ${i + 1}`)(l),
        text: t('A short line about this project.', 'یک خط درباره‌ی این پروژه.')(l),
        link: i === 0 ? '#k1' : '',
      })),
    },
  },
];

// Replace an earlier run's page, and give every block an anchor (#k1 … #k12) for the tests.
for (const old of await (await fetch(`${API}/admin/pages`, { headers: auth })).json()) {
  if (old.name === 'Classic') await fetch(`${API}/admin/pages/${old.id}`, { method: 'DELETE', headers: auth });
}
const withAnchors = (list) => list.map((b) => ({ ...b, props: { ...b.props, anchor: b.id } }));
const page = await (
  await fetch(`${API}/admin/pages`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Classic' }),
  })
).json();
const upd = await fetch(`${API}/admin/pages/${page.id}`, {
  method: 'PATCH',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({
    theme: { background: '#ffffff' },
    translations: ['en', 'fa'].map((l) => ({
      locale: l,
      title: t('Classic', 'کلاسیک')(l),
      slug: 'classic',
      blocks: withAnchors(blocks(l)),
    })),
  }),
});
console.log('update', upd.status, upd.ok ? '' : await upd.text());
const pub = await fetch(`${API}/admin/pages/${page.id}/publish`, { method: 'POST', headers: auth });
console.log('publish', pub.status);
const saved = await (await fetch(`${API}/admin/pages/${page.id}`, { headers: auth })).json();
console.log('rich text saved as:', saved.translations.find((x) => x.locale === 'en').blocks.find((b) => b.type === 'rich-text').props.html);
console.log('page id', page.id);
