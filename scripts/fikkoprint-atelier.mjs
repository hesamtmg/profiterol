/**
 * The FikkoPrint page in the Atelier blocks (the warm workshop look of whitecotton.pt), used by seed-fikkoprint.mjs.
 * FikkoPrint only prints, by sublimation: customers bring their own polyester or coated blanks, or pick ours. It does
 * not make clothes, so where the original shows a factory's garments and fabrics, this shows what we print on and the
 * surfaces that take sublimation ink.
 *
 * `atelierContent` draws the pictures (warm placeholder scenes of a print studio, products on a dark shelf, material
 * swatches), uploads them with `up`, and returns the blocks per language, the theme and the menu.
 */

/** A pseudo-random sequence, so the pictures come out the same on every run. */
function seeded(seed) {
  let r = seed;
  return () => (r = (r * 9301 + 49297) % 233280) / 233280;
}

const INK = ['#00a0e9', '#e6007e', '#ffd400', '#1f2937'];
const PRINTS = ['#d9480f', '#0e7490', '#a21caf', '#ca8a04', '#15803d', '#be123c', '#1d4ed8'];

/** Warm light and a soft grain over a scene. */
const finish = (w, h) => `
  <radialGradient id="warm" cx=".25" cy=".2" r=".9"><stop offset="0" stop-color="#ffd9a8" stop-opacity=".35"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .18 0"/></filter>
  <g id="finish"><rect width="${w}" height="${h}" fill="url(#warm)"/><rect width="${w}" height="${h}" fill="url(#vig)"/><rect width="${w}" height="${h}" filter="url(#grain)"/></g>`;

/** A row of mugs on a shelf: blank white ones, or printed in the given colors. */
function mugRow(x, y, n, size, rnd, printed) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const mx = x + i * size * 1.45;
    const fill = printed ? PRINTS[Math.floor(rnd() * PRINTS.length)] : '#f5f1ea';
    out += `<path d="M ${mx + size} ${y + size * 0.25} c ${size * 0.45} 0 ${size * 0.45} ${size * 0.6} 0 ${size * 0.6}" fill="none" stroke="${printed ? fill : '#e7e1d8'}" stroke-width="${size * 0.12}"/>
      <rect x="${mx}" y="${y}" width="${size}" height="${size * 1.05}" rx="${size * 0.08}" fill="${fill}"/>
      <rect x="${mx + size * 0.62}" y="${y}" width="${size * 0.38}" height="${size * 1.05}" rx="${size * 0.08}" fill="#000" fill-opacity=".12"/>`;
    if (printed) out += `<circle cx="${mx + size * 0.4}" cy="${y + size * 0.45}" r="${size * 0.22}" fill="#fff" fill-opacity=".55"/>`;
  }
  return out;
}

/** Warm placeholder scenes of a sublimation studio. */
function scene(sharp, kind, { w = 1920, h = 1200, blur = 1.2 } = {}) {
  const rnd = seeded({ studio: 3, press: 7, printer: 11, facade: 13, shelf: 17 }[kind]);
  let body = '';
  if (kind === 'studio' || kind === 'press') {
    const close = kind === 'press';
    body = `<rect width="${w}" height="${h}" fill="#5b4334"/><rect width="${w}" height="${h * 0.62}" fill="#8a6c55"/>
      <rect x="${w * 0.06}" y="${h * 0.08}" width="${w * 0.22}" height="${h * 0.42}" fill="#f7e3c4"/>
      <path d="M ${w * 0.06} ${h * 0.08} L ${w * 0.28} ${h * 0.5} M ${w * 0.17} ${h * 0.08} V ${h * 0.5} M ${w * 0.06} ${h * 0.29} H ${w * 0.28}" stroke="#6f5543" stroke-width="10"/>
      <path d="M ${w * 0.06} ${h * 0.5} L ${w * 0.42} ${h} L ${w * 0.75} ${h} L ${w * 0.28} ${h * 0.5} Z" fill="#ffe8c4" fill-opacity=".14"/>`;
    // Shelves of blank and printed mugs on the wall
    for (let s = 0; s < 3; s++) {
      const sy = h * (0.16 + s * 0.14);
      body += `<rect x="${w * 0.42}" y="${sy + 58}" width="${w * 0.52}" height="12" fill="#3f2e24"/>${mugRow(w * 0.44, sy, 11, 52, rnd, s === 1)}`;
    }
    // The table, a flat heat press with a shirt on its plate, and a mug press
    const ty = close ? h * 0.6 : h * 0.68;
    body += `<rect y="${ty}" width="${w}" height="${h - ty}" fill="#3a2a20"/><rect y="${ty}" width="${w}" height="16" fill="#2a1d16"/>
      <g transform="translate(${close ? w * 0.18 : w * 0.3} ${ty - (close ? 330 : 250)}) scale(${close ? 1.35 : 1})">
        <rect x="0" y="190" width="520" height="50" rx="10" fill="#1d1b1a"/><rect x="20" y="168" width="480" height="26" rx="6" fill="#d8d2c8"/>
        <path d="M 120 168 L 160 120 H 360 L 400 168 Z" fill="${PRINTS[1]}"/><circle cx="260" cy="146" r="18" fill="#ffd400"/><circle cx="215" cy="152" r="9" fill="#e6007e"/>
        <rect x="10" y="40" width="500" height="70" rx="12" fill="#2b2826" transform="rotate(-14 10 110)"/>
        <rect x="230" y="-30" width="40" height="120" rx="8" fill="#3b3734" transform="rotate(-14 10 110)"/>
        <rect x="380" y="216" width="70" height="12" rx="6" fill="#ef4444"/>
      </g>
      <g transform="translate(${close ? w * 0.68 : w * 0.66} ${ty - 190})">
        <rect x="0" y="120" width="260" height="70" rx="12" fill="#1d1b1a"/><rect x="40" y="20" width="180" height="110" rx="55" fill="#2b2826"/>
        <rect x="70" y="40" width="120" height="70" rx="10" fill="${PRINTS[0]}"/><rect x="190" y="0" width="22" height="80" rx="8" fill="#3b3734"/>
      </g>
`;
  } else if (kind === 'printer') {
    body = `<rect width="${w}" height="${h}" fill="#4a372c"/><rect width="${w}" height="${h * 0.7}" fill="#7a5e4b"/><rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#33251d"/>
      <rect x="${w * 0.12}" y="${h * 0.3}" width="${w * 0.76}" height="${h * 0.16}" rx="24" fill="#26221f"/>
      <rect x="${w * 0.14}" y="${h * 0.32}" width="${w * 0.72}" height="26" rx="10" fill="#3a3531"/>
      ${INK.map((c, i) => `<circle cx="${w * 0.18 + i * 48}" cy="${h * 0.41}" r="15" fill="${c}"/>`).join('')}
      <rect x="${w * 0.74}" y="${h * 0.38}" width="${w * 0.1}" height="44" rx="8" fill="#38bdf8" fill-opacity=".8"/>
      <rect x="${w * 0.15}" y="${h * 0.46}" width="${w * 0.03}" height="${h * 0.3}" fill="#26221f"/><rect x="${w * 0.82}" y="${h * 0.46}" width="${w * 0.03}" height="${h * 0.3}" fill="#26221f"/>
      <path d="M ${w * 0.2} ${h * 0.46} H ${w * 0.8} L ${w * 0.84} ${h * 0.92} H ${w * 0.16} Z" fill="#f4efe6"/>`;
    for (let i = 0; i < 4; i++) {
      const y = h * (0.5 + i * 0.1);
      body += `<path d="M ${w * 0.22} ${y} C ${w * 0.4} ${y - 40}, ${w * 0.6} ${y + 40}, ${w * 0.78} ${y - 10} L ${w * 0.8} ${y + 50} C ${w * 0.6} ${y + 90}, ${w * 0.4} ${y + 10}, ${w * 0.21} ${y + 50} Z" fill="${PRINTS[(i * 2) % PRINTS.length]}" fill-opacity=".55"/>`;
    }
  } else if (kind === 'facade') {
    body = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3e5c"/><stop offset="1" stop-color="#e9a36b"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#sky)"/>
      <rect x="${w * 0.08}" y="${h * 0.12}" width="${w * 0.84}" height="${h * 0.78}" fill="#c9b49c"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${w * (0.12 + i * 0.1)}" y="${h * 0.18}" width="${w * 0.06}" height="${h * 0.14}" fill="${rnd() > 0.5 ? '#f7d9a0' : '#3d4a5c'}"/>`).join('')}
      <rect x="${w * 0.2}" y="${h * 0.48}" width="${w * 0.6}" height="${h * 0.42}" fill="#2e2620"/>
      <rect x="${w * 0.23}" y="${h * 0.55}" width="${w * 0.36}" height="${h * 0.33}" fill="#ffd9a0"/>
      ${mugRow(w * 0.26, h * 0.7, 6, 60, rnd, true)}
      <rect x="${w * 0.63}" y="${h * 0.55}" width="${w * 0.14}" height="${h * 0.35}" fill="#5a4636"/>
      <rect x="${w * 0.2}" y="${h * 0.4}" width="${w * 0.6}" height="${h * 0.08}" fill="#2b211c"/>
      <text x="${w / 2}" y="${h * 0.455}" font-family="DejaVu Sans, sans-serif" font-size="${h * 0.045}" font-weight="700" letter-spacing="12" fill="#f3efe8" text-anchor="middle">FIKKOPRINT</text>
      <rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="#3b332d"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${finish(w, h)}</defs>${body}<use href="#finish"/></svg>`;
  // A little blur, like a shallow focus, keeps the drawing behind the text instead of competing with it.
  return sharp(Buffer.from(svg)).blur(blur).jpeg({ quality: 84 }).toBuffer();
}

/** A square close-up of a material: knit, mesh, satin, canvas, glaze, brushed metal… */
function swatch(sharp, kind, color) {
  const s = 600;
  const noise = (freq, alpha, seed = 2) =>
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${alpha} 0"/></filter><rect width="${s}" height="${s}" filter="url(#n)"/>`;
  let body = '';
  if (kind === 'knit') {
    for (let y = 0; y < s; y += 18)
      for (let x = 0; x < s; x += 16)
        body += `<path d="M ${x} ${y} l 8 14 l 8 -14" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/>`;
    body += noise('.02 .05', 0.25);
  } else if (kind === 'mesh') {
    for (let y = 8; y < s; y += 26)
      for (let x = 8 + ((y / 26) % 2) * 13; x < s; x += 26) body += `<circle cx="${x}" cy="${y}" r="6" fill="#000" fill-opacity=".35"/>`;
  } else if (kind === 'satin') {
    body = `<defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <path d="M 0 200 C 200 120, 400 320, 600 220 L 600 600 L 0 600 Z" fill="#000" fill-opacity=".12"/><rect width="${s}" height="${s}" fill="url(#sh)"/>${noise('.004 .02', 0.12)}`;
  } else if (kind === 'canvas') {
    for (let i = 0; i < s; i += 6)
      body += `<path d="M ${i} 0 V ${s}" stroke="#000" stroke-opacity=".08" stroke-width="3"/><path d="M 0 ${i} H ${s}" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>`;
    body += noise('.05', 0.3);
  } else if (kind === 'glaze') {
    body = `<defs><radialGradient id="g" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs><rect width="${s}" height="${s}" fill="url(#g)"/><ellipse cx="200" cy="170" rx="120" ry="40" fill="#fff" fill-opacity=".7" transform="rotate(-25 200 170)"/>`;
  } else if (kind === 'metal') {
    for (let y = 0; y < s; y += 3) body += `<path d="M 0 ${y} H ${s}" stroke="${y % 6 ? '#fff' : '#000'}" stroke-opacity=".07"/>`;
    body += `<path d="M 0 0 L 600 600 L 600 380 L 220 0 Z" fill="#fff" fill-opacity=".18"/>`;
  } else if (kind === 'foam') {
    body = noise('.6', 0.35, 9);
  } else if (kind === 'board') {
    body = `<rect y="470" width="${s}" height="130" fill="#b08968"/>${noise('.01 .2', 0.25, 5)}<rect width="${s}" height="470" fill="#fff" fill-opacity=".4"/>`;
  } else {
    body = noise('.25', 0.3, 7);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${color}"/>${body}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

export async function atelierContent({ sharp, up, product, step }) {
  const shelf = ['#3a2c25', '#0d0a09'];
  const img = {
    studio: await up(scene(sharp, 'studio', { blur: 6 }), 'atelier-studio.jpg'),
    press: await up(scene(sharp, 'press', { w: 1200, h: 1500 }), 'atelier-press.jpg'),
    printer: await up(scene(sharp, 'printer', { w: 1200, h: 1500 }), 'atelier-printer.jpg'),
    facade: await up(scene(sharp, 'facade', { w: 1800, h: 1100 }), 'atelier-facade.jpg'),
    ctaStudio: await up(scene(sharp, 'press', { blur: 8 }), 'atelier-studio-close.jpg'),
    mug: await up(product('mug', { palette: 'sunset', seed: 3, bg: shelf }), 'shelf-mug.jpg'),
    bottle: await up(product('bottle', { palette: 'berry', seed: 29, bg: shelf }), 'shelf-bottle.jpg'),
    tshirt: await up(product('tshirt', { palette: 'ocean', seed: 5, bg: shelf }), 'shelf-tshirt.jpg'),
    jersey: await up(product('jersey', { palette: 'team', seed: 31, bg: shelf }), 'shelf-jersey.jpg'),
    cushion: await up(product('cushion', { palette: 'jungle', seed: 13, bg: shelf }), 'shelf-cushion.jpg'),
    panel: await up(product('panel', { palette: 'sunset', seed: 17, bg: shelf }), 'shelf-panel.jpg'),
    puzzle: await up(product('puzzle', { palette: 'candy', seed: 19, bg: shelf }), 'shelf-puzzle.jpg'),
    phone: await up(product('phone', { palette: 'berry', seed: 11, bg: shelf }), 'shelf-phone.jpg'),
    mousepad: await up(product('mousepad', { palette: 'ocean', seed: 23, bg: shelf }), 'shelf-mousepad.jpg'),
    coaster: await up(product('coaster', { palette: 'jungle', seed: 37, bg: shelf }), 'shelf-coasters.jpg'),
    paper: await up(step('paper'), 'atelier-transfer-paper.jpg'),
    gas: await up(step('gas'), 'atelier-ink-gas.jpg'),
  };
  const sw = {};
  for (const [key, kind, color] of [
    ['jersey', 'knit', '#f4f4f2'],
    ['mesh', 'mesh', '#e8eef5'],
    ['satin', 'satin', '#ece6f2'],
    ['canvas', 'canvas', '#ebe3d3'],
    ['fleece', 'other', '#efe9e1'],
    ['blend', 'knit', '#d9d6d0'],
    ['ceramic', 'glaze', '#f7f7f5'],
    ['aluminium', 'metal', '#c9ccd1'],
    ['steel', 'metal', '#e5e7ea'],
    ['polymer', 'glaze', '#eef2f7'],
    ['neoprene', 'foam', '#2f3237'],
    ['mdf', 'board', '#f2efe9'],
  ])
    sw[key] = await up(swatch(sharp, kind, color), `swatch-${key}.jpg`);

  const t = (en, fa) => (l) => (l === 'en' ? en : fa);
  const EMAIL = 'info@fikkoprint.com';

  const blocks = (l) => [
    {
      id: 'hero',
      type: 'craft-hero',
      props: {
        eyebrow: t('Sublimation print studio · Tehran', 'استودیو چاپ سابلیمیشن · تهران')(l),
        title: t('From your file', 'از فایل شما')(l),
        titleItalic: t('into the fibre.', 'تا دلِ الیاف.')(l),
        text: t(
          'We don’t make clothes or mugs. We do one thing: print your designs into them, by sublimation — on your own blanks or ours.',
          'ما لباس یا ماگ تولید نمی‌کنیم. فقط یک کار می‌کنیم: طرح شما را با سابلیمیشن درونشان چاپ می‌کنیم؛ روی محصول خودتان یا محصولات خام ما.',
        )(l),
        buttonLabel: t('Get a quote', 'استعلام قیمت')(l),
        buttonLink: '#order',
        secondButtonLabel: t('How it works', 'چطور کار می‌کنیم')(l),
        secondButtonLink: '#steps',
        image: img.studio,
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
            'Mugs & drinkware',
            'Sportswear & team kits',
            'Polyester T-shirts',
            'Cushions & home',
            'Metal photo panels',
            'Flags & fabric banners',
            'Phone cases',
            'Puzzles & gifts',
          ],
          [
            'ماگ و ظروف',
            'لباس ورزشی و تیمی',
            'تی‌شرت پلی‌استر',
            'کوسن و دکور',
            'تابلو فلزی',
            'پرچم و بنر پارچه‌ای',
            'قاب موبایل',
            'پازل و هدیه',
          ],
        )(l).map((name) => ({ image: '', name, link: '' })),
        seconds: 40,
        twoRows: false,
        look: 'dark',
      },
    },
    {
      id: 'steps',
      type: 'step-cards',
      props: {
        anchor: 'steps',
        eyebrow: t('How to start', 'از کجا شروع کنیم')(l),
        title: t('From your idea', 'از ایده‌ی شما')(l),
        titleItalic: t('to a printed piece.', 'تا قطعه‌ی چاپ‌شده.')(l),
        note: t('No complexity. Here is how printing with us actually looks.', 'بدون پیچیدگی. چاپ با ما واقعاً همین‌طور است.')(l),
        steps: [
          [
            t('Step 01', 'گام ۰۱'),
            t('Send your file', 'فایلتان را بفرستید'),
            t(
              'A design, a logo or just a phone photo. Tell us what to print it on — your blanks or ours.',
              'طرح، لوگو یا حتی یک عکس موبایل. بگویید روی چه چیزی چاپ شود؛ محصول خودتان یا محصولات خام ما.',
            ),
            t('Free file check', 'بررسی رایگان فایل'),
            t('Within a day', 'ظرف یک روز'),
            t('What can be printed', 'چه چیزی چاپ می‌شود'),
            '#materials',
          ],
          [
            t('Step 02', 'گام ۰۲'),
            t('Get a quote', 'قیمت بگیرید'),
            t(
              'A clear price per piece, with the file preparation included and nothing hidden.',
              'قیمت شفاف هر قطعه، با آماده‌سازی فایل و بدون هزینه‌ی پنهان.',
            ),
            t('Per piece', 'قیمت هر قطعه'),
            t('From one piece', 'از یک عدد'),
            t('See the prices', 'دیدن قیمت‌ها'),
            '#order',
          ],
          [
            t('Step 03', 'گام ۰۳'),
            t('Approve a test print', 'نمونه را تأیید کنید'),
            t(
              'We press one piece first and send you a photo. Colour, size and position are fixed before the rest.',
              'اول یک قطعه پرس می‌کنیم و عکسش را می‌فرستیم. رنگ، اندازه و جای طرح پیش از بقیه قطعی می‌شود.',
            ),
            t('Test print', 'چاپ آزمایشی'),
            t('Colour matched', 'تطبیق رنگ'),
            t('How the press works', 'پرس چطور کار می‌کند'),
            '#capabilities',
          ],
          [
            t('Step 04', 'گام ۰۴'),
            t('Printing', 'چاپ'),
            t(
              'Every piece pressed, checked by hand, packed and sent across Iran — or picked up from the studio.',
              'هر قطعه پرس، با دست کنترل، بسته‌بندی و به سراسر ایران ارسال می‌شود؛ یا از استودیو تحویل بگیرید.',
            ),
            t('Piece by piece', 'قطعه به قطعه'),
            t('Checked by hand', 'کنترل دستی'),
            t('Inside the studio', 'درون استودیو'),
            '#studio',
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
        footnote: t('Not sure your product can be sublimated?', 'مطمئن نیستید محصولتان قابل سابلیمیشن است؟')(l),
        footnoteLabel: t('Check the surfaces', 'جنس‌ها را ببینید')(l),
        footnoteLink: '#materials',
      },
    },
    {
      id: 'showroom',
      type: 'showroom',
      props: {
        anchor: 'products',
        eyebrow: t('Showroom', 'ویترین')(l),
        title: t('What we', 'آنچه')(l),
        titleItalic: t('print on.', 'رویش چاپ می‌کنیم.')(l),
        allLabel: t('Everything', 'همه')(l),
        items: [
          [img.mug, t('Mugs', 'ماگ'), t('Drinkware', 'ظروف')],
          [img.bottle, t('Bottles', 'قمقمه'), t('Drinkware', 'ظروف')],
          [img.tshirt, t('T-shirts', 'تی‌شرت'), t('Apparel', 'پوشاک')],
          [img.jersey, t('Team kits', 'لباس تیمی'), t('Apparel', 'پوشاک')],
          [img.cushion, t('Cushions', 'کوسن'), t('Home', 'خانه')],
          [img.panel, t('Metal panels', 'تابلو فلزی'), t('Home', 'خانه')],
          [img.puzzle, t('Puzzles', 'پازل'), t('Gifts', 'هدیه')],
          [img.phone, t('Phone cases', 'قاب موبایل'), t('Gifts', 'هدیه')],
          [img.mousepad, t('Mouse pads', 'ماوس‌پد'), t('Office', 'اداری')],
          [img.coaster, t('Coasters', 'زیرلیوانی'), t('Office', 'اداری')],
        ].map(([image, name, category]) => ({ image, name: name(l), category: category(l), link: '#order' })),
        note: t(
          'We print; we don’t sew or make blanks · bring yours or choose ours',
          'ما چاپ می‌کنیم، تولید نمی‌کنیم · محصول خودتان را بیاورید یا از ما بخرید',
        )(l),
        buttonLabel: t('Ask about your product', 'درباره‌ی محصولتان بپرسید')(l),
        buttonLink: '#order',
      },
    },
    {
      id: 'story',
      type: 'story-tabs',
      props: {
        eyebrow: t('Our story', 'داستان ما')(l),
        title: t('One process.', 'یک روش.')(l),
        titleItalic: t('Done properly.', 'درست و کامل.')(l),
        links: [
          { label: t('What we print on', 'روی چه چاپ می‌کنیم')(l), link: '#products' },
          { label: t('How to start', 'از کجا شروع کنیم')(l), link: '#steps' },
        ],
        tabs: [
          {
            label: t('Why only sublimation', 'چرا فقط سابلیمیشن')(l),
            text: t(
              'Most print shops do a little of everything. We chose to do one thing. Sublimation turns ink into a gas that sinks into polyester and coatings, so the print never cracks, peels or washes out — and doing only this, every day, is how we learned its every detail.',
              'بیشتر چاپخانه‌ها کمی از همه‌چیز انجام می‌دهند. ما یک کار را انتخاب کردیم. سابلیمیشن جوهر را به گازی تبدیل می‌کند که در پلی‌استر و پوشش‌ها فرو می‌رود؛ چاپ نه ترک می‌خورد، نه پوسته می‌شود و نه با شستشو می‌رود. هر روز فقط همین کار را کردن، یعنی شناختن همه‌ی جزئیاتش.',
            )(l),
          },
          {
            label: t('Our craft', 'مهارت ما')(l),
            text: t(
              'Every surface has its own recipe of heat, time and pressure. A mug wants a different minute than a cushion; aluminium forgives nothing. We test each new blank before it reaches a customer, and keep the settings that work.',
              'هر سطح دستور خودش را از دما، زمان و فشار دارد. ماگ یک دقیقه‌ی متفاوت از کوسن می‌خواهد و آلومینیوم هیچ اشتباهی را نمی‌بخشد. هر محصول خام جدید را پیش از رسیدن به دست مشتری آزمایش می‌کنیم و تنظیماتی را که جواب می‌دهد نگه می‌داریم.',
            )(l),
          },
          {
            label: t('Our promise', 'قول ما')(l),
            text: t(
              'If your product can’t take sublimation, we tell you before you pay — not after. If a print isn’t right, we print it again. That’s the whole policy.',
              'اگر محصول شما سابلیمیشن را نمی‌گیرد، پیش از پرداخت می‌گوییم، نه بعدش. اگر چاپی درست نبود، دوباره چاپش می‌کنیم. همه‌ی قانون ما همین است.',
            )(l),
          },
        ],
      },
    },
    {
      id: 'studio',
      type: 'place-photos',
      props: {
        anchor: 'studio',
        photo: img.press,
        photo2: img.printer,
        badgeTitle: t('Print only', 'فقط چاپ')(l),
        badgeText: t('Sublimation studio\nTehran · Iran', 'استودیو سابلیمیشن\nتهران · ایران')(l),
        eyebrow: t('The studio', 'استودیو')(l),
        title: t('Where it', 'جایی که')(l),
        titleItalic: t('all happens.', 'همه‌چیز اتفاق می‌افتد.')(l),
        text: t(
          'Printers, transfer paper and heat presses, under one roof. The people who check your file are the same people who press your pieces — so nothing is lost between a sales desk and a workshop.',
          'چاپگرها، کاغذ انتقال و پرس‌های حرارتی، زیر یک سقف. کسانی که فایل شما را بررسی می‌کنند همان‌هایی هستند که قطعه‌هایتان را پرس می‌کنند؛ پس چیزی میان میز فروش و کارگاه گم نمی‌شود.',
        )(l),
        buttonLabel: t('Visit us', 'به ما سر بزنید')(l),
        buttonLink: '#visit',
        photoSide: 'start',
      },
    },
    {
      id: 'capabilities',
      type: 'capability-stack',
      props: {
        anchor: 'capabilities',
        eyebrow: t('What we do', 'کار ما')(l),
        title: t('Sublimation', 'سابلیمیشن،')(l),
        titleItalic: t('capabilities.', 'در چهار پرس.')(l),
        cards: [
          [
            t('Mug & bottle press', 'پرس ماگ و قمقمه'),
            t(
              'Wrap presses for coated ceramic and steel: edge-to-edge photos, names on every piece, dishwasher-safe colour.',
              'پرس استوانه‌ای برای سرامیک و فولاد پوشش‌دار: عکس سرتاسری، نام روی هر قطعه، رنگ مقاوم در ماشین ظرف‌شویی.',
            ),
            img.mug,
            t('Sunset mug', 'ماگ غروب'),
            t('330 ml · white coated ceramic', '۳۳۰ میلی‌لیتر · سرامیک سفید پوشش‌دار'),
            img.bottle,
            t('Berry bottle', 'قمقمه‌ی تمشکی'),
            t('500 ml · coated steel', '۵۰۰ میلی‌لیتر · فولاد پوشش‌دار'),
          ],
          [
            t('Flat press for apparel', 'پرس تخت پوشاک'),
            t(
              'Polyester T-shirts and sportswear printed edge to edge. The print breathes with the fabric — no heavy layer to feel.',
              'تی‌شرت پلی‌استر و لباس ورزشی با چاپ سرتاسری. چاپ همراه پارچه نفس می‌کشد؛ هیچ لایه‌ی سنگینی حس نمی‌شود.',
            ),
            img.jersey,
            t('Home kit no. 10', 'لباس تیم، شماره‌ی ۱۰'),
            t('100% polyester · name and number', 'پلی‌استر ۱۰۰٪ · نام و شماره'),
            img.tshirt,
            t('Ocean tee', 'تی‌شرت اقیانوس'),
            t('All-over print · white base', 'چاپ سراسری · زمینه‌ی سفید'),
          ],
          [
            t('Metal & photo panels', 'تابلو فلزی و عکس'),
            t(
              'Coated aluminium gives the deepest colour sublimation can make — a photo with the shine of glass.',
              'آلومینیوم پوشش‌دار عمیق‌ترین رنگی را می‌دهد که سابلیمیشن می‌سازد؛ عکسی با درخشش شیشه.',
            ),
            img.panel,
            t('Evening panel', 'تابلوی شامگاه'),
            t('Gloss aluminium · ready to hang', 'آلومینیوم براق · آماده‌ی نصب'),
            img.puzzle,
            t('Family puzzle', 'پازل خانوادگی'),
            t('Coated board · 120 to 500 pieces', 'تخته‌ی پوشش‌دار · ۱۲۰ تا ۵۰۰ قطعه'),
          ],
          [
            t('Home, office & gifts', 'خانه، اداره و هدیه'),
            t(
              'Cushions, mouse pads, coasters and phone cases — small runs for gifts, larger ones for brands and events.',
              'کوسن، ماوس‌پد، زیرلیوانی و قاب موبایل؛ تیراژ کم برای هدیه و تیراژ بیشتر برای برندها و رویدادها.',
            ),
            img.cushion,
            t('Jungle cushion', 'کوسن جنگلی'),
            t('Polyester canvas · two sides', 'کرباس پلی‌استر · دورو'),
            img.mousepad,
            t('Desk set', 'ست میز'),
            t('Neoprene base · stitched edge', 'پایه‌ی نئوپرن · لبه‌ی دوخته'),
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
          linkLabel: t('Ask for a sample', 'نمونه بخواهید')(l),
          link: '#order',
        })),
        footnote: t('Tehran · sublimation only', 'تهران · فقط سابلیمیشن')(l),
        buttonLabel: t('Order', 'سفارش')(l),
        buttonLink: '#order',
      },
    },
    {
      id: 'materials',
      type: 'swatch-library',
      props: {
        anchor: 'materials',
        eyebrow: t('Surface library', 'کتابخانه‌ی جنس‌ها')(l),
        title: t('The surfaces', 'سطح‌هایی که')(l),
        titleItalic: t('that take the ink.', 'جوهر را می‌گیرند.')(l),
        swatches: [
          [
            sw.jersey,
            t('Polyester jersey', 'جرسی پلی‌استر'),
            t('100% polyester', 'پلی‌استر ۱۰۰٪'),
            t('The classic T-shirt fabric. The brightest result on any garment.', 'پارچه‌ی کلاسیک تی‌شرت. زنده‌ترین نتیجه روی پوشاک.'),
          ],
          [
            sw.mesh,
            t('Sports mesh', 'مش ورزشی'),
            t('Breathable poly', 'پلی‌استر تنفسی'),
            t('For team kits: light, fast-drying, full colour edge to edge.', 'برای لباس تیمی: سبک، زودخشک، رنگ کامل از لبه تا لبه.'),
          ],
          [
            sw.satin,
            t('Polyester satin', 'ساتن پلی‌استر'),
            t('Soft sheen', 'براقیت نرم'),
            t('Scarves, ribbons and flags with a soft shine.', 'شال، روبان و پرچم با درخششی نرم.'),
          ],
          [
            sw.canvas,
            t('Poly canvas', 'کرباس پلی‌استر'),
            t('Heavy weave', 'بافت ضخیم'),
            t('Cushion covers and tote bags that hold their shape.', 'روکش کوسن و ساک پارچه‌ای که فرمشان را حفظ می‌کنند.'),
          ],
          [
            sw.fleece,
            t('Poly fleece', 'پولار پلی‌استر'),
            t('Brushed', 'برس‌خورده'),
            t('Blankets and throws; colours a little softer than on jersey.', 'پتو و روانداز؛ رنگ‌ها کمی نرم‌تر از جرسی.'),
          ],
          [
            sw.blend,
            t('Poly-cotton', 'مخلوط پلی‌پنبه'),
            t('65% polyester and up', 'از ۶۵٪ پلی‌استر'),
            t(
              'Works, with a paler, vintage look. Below about 65% polyester we advise against it.',
              'جواب می‌دهد، با ظاهری کم‌رنگ و قدیمی. زیر حدود ۶۵٪ پلی‌استر توصیه نمی‌کنیم.',
            ),
          ],
          [
            sw.ceramic,
            t('Coated ceramic', 'سرامیک پوشش‌دار'),
            t('Mugs · tiles', 'ماگ · کاشی'),
            t(
              'Needs a special polymer coating; an ordinary shop mug won’t hold the ink.',
              'پوشش پلیمری مخصوص لازم دارد؛ ماگ معمولی مغازه جوهر را نگه نمی‌دارد.',
            ),
          ],
          [
            sw.aluminium,
            t('Coated aluminium', 'آلومینیوم پوشش‌دار'),
            t('Gloss · matte', 'براق · مات'),
            t('Photo panels with the deepest colours sublimation can give.', 'تابلوی عکس با عمیق‌ترین رنگ‌هایی که سابلیمیشن می‌دهد.'),
          ],
          [
            sw.steel,
            t('Coated steel', 'فولاد پوشش‌دار'),
            t('Bottles · tumblers', 'قمقمه · لیوان'),
            t(
              'Water bottles and travel mugs that keep their colour outdoors.',
              'قمقمه و لیوان سفری که رنگشان را بیرون از خانه هم حفظ می‌کنند.',
            ),
          ],
          [
            sw.polymer,
            t('Polymer inserts', 'صفحه‌ی پلیمری'),
            t('Phone cases', 'قاب موبایل'),
            t('Glossy coated plates set into the case after pressing.', 'صفحه‌های براق پوشش‌دار که پس از پرس داخل قاب می‌نشینند.'),
          ],
          [
            sw.neoprene,
            t('Neoprene', 'نئوپرن'),
            t('Poly top', 'رویه‌ی پلی‌استر'),
            t('Mouse pads and coasters with a soft rubber base.', 'ماوس‌پد و زیرلیوانی با پایه‌ی لاستیکی نرم.'),
          ],
          [
            sw.mdf,
            t('Coated board', 'تخته‌ی پوشش‌دار'),
            t('Puzzles · signs', 'پازل · تابلو'),
            t('Hard white board for puzzles, coasters and small signs.', 'تخته‌ی سخت سفید برای پازل، زیرلیوانی و تابلوهای کوچک.'),
          ],
        ].map(([image, name, spec, text]) => ({ image, name: name(l), spec: spec(l), text: text(l) })),
        hint: t('Tap any surface for details', 'برای جزئیات روی هر جنس بزنید')(l),
        note: t(
          'Cotton and dark fabrics can’t be sublimated. We’ll always tell you before you order.',
          'پنبه و پارچه‌ی تیره سابلیمیشن نمی‌شوند. همیشه پیش از سفارش به شما می‌گوییم.',
        )(l),
        buttonLabel: t('Ask about your product', 'درباره‌ی محصولتان بپرسید')(l),
        buttonLink: '#order',
      },
    },
    {
      id: 'quotes',
      type: 'quote-fan',
      props: {
        eyebrow: t('What customers say', 'مشتریان چه می‌گویند')(l),
        title: t('From the people', 'از زبان کسانی که')(l),
        titleItalic: t('we print for.', 'برایشان چاپ می‌کنیم.')(l),
        quotes: [
          [
            t(
              'Our team kits went through a whole season of matches and washing machines. The numbers still look new.',
              'لباس‌های تیممان یک فصل کامل مسابقه و لباسشویی را گذراند. شماره‌ها هنوز نو به نظر می‌رسند.',
            ),
            t('Arash M.', 'آرش م.'),
            t('Futsal coach', 'مربی فوتسال'),
          ],
          [
            t(
              'I brought my own polyester shirts. They tested one first and showed me the result before printing the rest.',
              'تی‌شرت‌های پلی‌استر خودم را آوردم. اول یکی را آزمایش کردند و پیش از چاپ بقیه نتیجه را نشانم دادند.',
            ),
            t('Sara K.', 'سارا ک.'),
            t('Clothing brand', 'برند پوشاک'),
          ],
          [
            t(
              'Three hundred mugs for our anniversary, and every one the exact same shade of our green.',
              'سیصد ماگ برای سالگردمان، و همه دقیقاً همان سبزِ برند ما.',
            ),
            t('Pouya R.', 'پویا ر.'),
            t('Café owner', 'صاحب کافه'),
          ],
          [
            t(
              'They told me my cotton bags wouldn’t work — before I paid. We switched to poly canvas and they’re perfect.',
              'پیش از پرداخت گفتند کیسه‌های نخی من جواب نمی‌دهند. به کرباس پلی‌استر تغییر دادیم و عالی شدند.',
            ),
            t('Mina J.', 'مینا ج.'),
            t('Gift shop', 'فروشگاه هدیه'),
          ],
          [
            t(
              'A blurry phone photo of my grandmother became a metal panel that now hangs in our living room.',
              'یک عکس تار موبایلی از مادربزرگم تابلویی فلزی شد که حالا در پذیرایی خانه‌مان است.',
            ),
            t('Negar S.', 'نگار س.'),
            t('Gift order', 'سفارش هدیه'),
          ],
        ].map(([quote, name, role]) => ({ quote: quote(l), name: name(l), role: role(l) })),
        seconds: 6,
      },
    },
    {
      id: 'news',
      type: 'collection-list',
      props: {
        anchor: 'news',
        title: t('Sublimation news', 'اخبار سابلیمیشن')(l),
        subtitle: t(
          'What is new in the presses, inks and printers of our trade, with a link to each source.',
          'تازه‌های پرس، جوهر و چاپگرهای حرفه‌ی ما، با لینک به منبع هر خبر.',
        )(l),
        collection: 'news',
        variant: 'photo',
        columns: '3',
        limit: 3,
        tag: '',
        showFilters: false,
        buttonLabel: t('All news', 'همه‌ی اخبار')(l),
      },
    },
    {
      id: 'visit',
      type: 'place-facts',
      props: {
        anchor: 'visit',
        eyebrow: t('A real studio', 'یک استودیوی واقعی')(l),
        title: t('Real place.', 'جای واقعی.')(l),
        titleItalic: t('Real people.', 'آدم‌های واقعی.')(l),
        text: t(
          'No middlemen and no virtual office. Come by, bring your blanks, and watch your first piece come off the press.',
          'بدون واسطه و دفتر مجازی. سر بزنید، محصول خامتان را بیاورید و بیرون آمدن اولین قطعه از زیر پرس را ببینید.',
        )(l),
        image: img.facade,
        place: t('Tehran, Iran', 'تهران، ایران')(l),
        address: t('Visits by appointment', 'بازدید با هماهنگی قبلی')(l),
        mapLabel: '',
        mapLink: '',
        details: [
          { value: t('Saturday to Wednesday, 9:00–18:00', 'شنبه تا چهارشنبه، ۹ تا ۱۸')(l), label: t('Studio hours', 'ساعت کاری')(l) },
          { value: EMAIL, label: t('Email', 'ایمیل')(l) },
          { value: t('Post or courier, everywhere in Iran', 'پست یا پیک، به سراسر ایران')(l), label: t('Shipping', 'ارسال')(l) },
        ],
        facts: [
          { value: t('1', '۱')(l), label: t('Minimum order', 'حداقل سفارش')(l) },
          { value: t('24h', '۲۴ ساعت')(l), label: t('Typical turnaround', 'زمان معمول')(l) },
          { value: t('40+', '+۴۰')(l), label: t('Kinds of product', 'نوع محصول')(l) },
          { value: t('100%', '۱۰۰٪')(l), label: t('Sublimation', 'سابلیمیشن')(l) },
        ],
        badgesTitle: t('What we promise', 'آنچه قول می‌دهیم')(l),
        badges: [
          [t('Test print first', 'اول نمونه'), t('One piece before the rest', 'یک قطعه پیش از بقیه')],
          [t('Honest advice', 'مشاوره‌ی صادقانه'), t('We say no before you pay', 'پیش از پرداخت «نه» می‌گوییم')],
          [t('Washable prints', 'چاپ شستنی'), t('Inside the fibre, not on it', 'درون الیاف، نه رویش')],
          [t('Reprint guarantee', 'تضمین چاپ دوباره'), t('Not right? We print it again', 'درست نبود؟ دوباره چاپ می‌کنیم')],
        ].map(([name, text]) => ({ name: name(l), text: text(l) })),
        badgesNote: '',
      },
    },
    {
      id: 'faq',
      type: 'faq',
      props: {
        anchor: 'faq',
        title: t('What people ask before their first order', 'پرسش‌هایی که پیش از اولین سفارش می‌پرسند')(l),
        subtitle: '',
        items: [
          [
            t('Do you make the T-shirts and mugs too?', 'تی‌شرت و ماگ را هم خودتان تولید می‌کنید؟'),
            t(
              'No — we only print. Bring your own polyester or coated blanks, or choose from the blanks we keep in stock for printing.',
              'نه؛ ما فقط چاپ می‌کنیم. محصول پلی‌استر یا پوشش‌دار خودتان را بیاورید، یا از محصولات خامی که برای چاپ نگه می‌داریم انتخاب کنید.',
            ),
          ],
          [
            t('Can you print on cotton or black fabric?', 'روی پنبه یا پارچه‌ی مشکی چاپ می‌کنید؟'),
            t(
              'Not by sublimation: the ink needs polyester or a polymer coating, and a white or light base. We will tell you before you order.',
              'با سابلیمیشن نه؛ جوهر پلی‌استر یا پوشش پلیمری و زمینه‌ی سفید یا روشن می‌خواهد. پیش از سفارش به شما می‌گوییم.',
            ),
          ],
          [
            t('Will the print wash out or crack?', 'چاپ با شستشو می‌رود یا ترک می‌خورد؟'),
            t('No. The ink is inside the fibre or the coating, not on top of it.', 'نه. جوهر درون الیاف یا پوشش است، نه روی آن.'),
          ],
          [
            t('What is the minimum order?', 'حداقل سفارش چقدر است؟'),
            t('One piece. Prices drop as the quantity grows.', 'یک عدد. با بیشتر شدن تعداد، قیمت پایین می‌آید.'),
          ],
          [
            t('How long does it take?', 'چقدر طول می‌کشد؟'),
            t(
              'Single pieces usually within 24 hours of approving the test print; larger runs in two to five working days.',
              'سفارش تکی معمولاً ۲۴ ساعت پس از تأیید نمونه؛ تیراژ بیشتر دو تا پنج روز کاری.',
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
        title: t('Send us your design', 'طرحتان را برایمان بفرستید')(l),
        text: t(
          'Tell us what to print, on what, and how many. We reply within one working day with a mock-up and a price.',
          'بگویید چه چیزی، روی چه و چند عدد. ظرف یک روز کاری با پیش‌نمایش و قیمت پاسخ می‌دهیم.',
        )(l),
        fields: [
          { label: t('Name', 'نام')(l), type: 'text', required: true, options: '', placeholder: '' },
          { label: t('Phone', 'تلفن همراه')(l), type: 'tel', required: true, options: '', placeholder: '' },
          { label: t('Email', 'ایمیل')(l), type: 'email', required: false, options: '', placeholder: '' },
          {
            label: t('Print on', 'چاپ روی')(l),
            type: 'select',
            required: true,
            options: t('My own blanks, Your blanks, Not sure yet', 'محصول خودم, محصول خام شما, هنوز نمی‌دانم')(l),
            placeholder: '',
          },
          {
            label: t('Product and quantity', 'محصول و تعداد')(l),
            type: 'text',
            required: true,
            options: '',
            placeholder: t('e.g. 40 polyester T-shirts', 'مثلاً ۴۰ تی‌شرت پلی‌استر')(l),
          },
          {
            label: t('Your idea', 'ایده‌ی شما')(l),
            type: 'textarea',
            required: false,
            options: '',
            placeholder: t('A link to your design, or describe it…', 'لینک طرح یا توضیح آن…')(l),
          },
        ],
        submitLabel: t('Send', 'ارسال')(l),
        successMessage: t('Thank you! We’ll be in touch within one working day.', 'ممنون! ظرف یک روز کاری با شما تماس می‌گیریم.')(l),
      },
    },
    {
      id: 'cta',
      type: 'photo-cta',
      props: {
        eyebrow: t('Print with us', 'با ما چاپ کنید')(l),
        title: t('Ready to print', 'آماده‌اید')(l),
        titleItalic: t('with the studio?', 'با استودیو چاپ کنید؟')(l),
        text: t(
          'No middlemen and no minimum. Just a studio that does sublimation, and only sublimation, properly.',
          'بدون واسطه و بدون حداقل سفارش. فقط استودیویی که سابلیمیشن، و فقط سابلیمیشن، را درست انجام می‌دهد.',
        )(l),
        image: img.ctaStudio,
        stats: [
          { value: t('1', '۱')(l), label: t('Piece minimum', 'حداقل سفارش')(l) },
          { value: t('24h', '۲۴ ساعت')(l), label: t('Turnaround', 'آماده‌سازی')(l) },
          { value: t('Direct', 'مستقیم')(l), label: t('No middlemen', 'بدون واسطه')(l) },
          { value: t('Only', 'فقط')(l), label: t('Sublimation', 'سابلیمیشن')(l) },
        ],
        buttonLabel: t('Get a quote', 'استعلام قیمت')(l),
        buttonLink: '#order',
        columns: [
          [
            t('What we print on', 'روی چه چاپ می‌کنیم'),
            t('Mugs, apparel, panels, gifts', 'ماگ، پوشاک، تابلو، هدیه'),
            t('Showroom', 'ویترین'),
            '#products',
          ],
          [
            t('Surfaces', 'جنس‌ها'),
            t('What takes sublimation ink', 'چه چیزی جوهر سابلیمیشن را می‌گیرد'),
            t('Library', 'کتابخانه'),
            '#materials',
          ],
          [t('News', 'اخبار'), t('Presses, inks and printers', 'پرس، جوهر و چاپگر'), t('Read', 'بخوانید'), '#news'],
          [t('Write to us', 'برایمان بنویسید'), EMAIL, t('Email', 'ایمیل'), `mailto:${EMAIL}`],
        ].map(([title, text, linkLabel, link]) => ({
          title: title(l),
          text: typeof text === 'function' ? text(l) : text,
          linkLabel: linkLabel(l),
          link,
        })),
      },
    },
  ];

  const theme = {
    primary: '#6e4b3c',
    secondary: '#9b948d',
    background: '#f3efe8',
    surface: '#fbf9f5',
    dark: '#2b211c',
    text: '#16120f',
    muted: '#766d66',
    radius: '1.5rem',
    buttonRadius: '0.25rem',
    fontEn: 'Manrope',
    headerStyle: 'solid',
    cursor: 'default',
    pageTransition: 'fade',
  };
  const menu = [
    { href: '#steps', label: { fa: 'شروع', en: 'Start here' } },
    { href: '#products', label: { fa: 'محصولات', en: 'Products' } },
    { href: '#capabilities', label: { fa: 'توانایی‌ها', en: 'Capabilities' } },
    { href: '#materials', label: { fa: 'جنس‌ها', en: 'Surfaces' } },
    { href: '#news', label: { fa: 'اخبار', en: 'News' } },
    { href: '#order', label: { fa: 'سفارش', en: 'Order' } },
  ];
  return { blocks, theme, menu };
}
