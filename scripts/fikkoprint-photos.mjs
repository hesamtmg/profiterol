/**
 * Real photos for the FikkoPrint site, from Wikimedia Commons, used by seed-fikkoprint.mjs in place of drawings.
 * Every one is freely licensed (CC0, CC BY, CC BY-SA or public domain). Their author and license are read from
 * Commons when the script runs, written into each picture's description in the media library, and listed with links
 * to their Commons page and original file on the site's "Photo credits" page.
 *
 * They show sublimation, printing and printed products in general: they are not photos of FikkoPrint's own studio,
 * products or customers, and the credits page says so. Replace them with your own photos in the editor.
 */

const UA = 'profiterol-seed/1.0 (https://github.com/hesamtmg/profiterol)';
const API = 'https://commons.wikimedia.org/w/api.php';

/** Commons files by the key the page uses, with what each shows on the site. */
export const COMMONS_PHOTOS = {
  hero: [
    'File:Some industrial printing objects and garments decorated digitally.jpg',
    'Digitally printed tableware, cushions and garments',
    'ظروف، کوسن و پوشاک با چاپ دیجیتال',
  ],
  pressing: [
    'File:A graphic designer transferring an impression on to a shirt with heat press.jpg',
    'Pressing a print onto a shirt with a heat press',
    'انتقال طرح روی پیراهن با پرس حرارتی',
  ],
  fabricPrinter: [
    'File:CottonBee drukarka.jpg',
    'A printer laying a colourful pattern onto fabric',
    'چاپگری که طرحی رنگی روی پارچه چاپ می‌کند',
  ],
  wideFormat: ['File:Large format digital printer.jpg', 'A large-format digital printer', 'چاپگر دیجیتال عریض'],
  mug: [
    'File:020211020 porcelain mug with transfer-printed onglaze in black, 1757, RH Worcester.jpg',
    'A porcelain mug with a printed design',
    'ماگ چینی با طرح چاپی',
  ],
  bottle: ['File:Metal Water Bottles.jpeg', 'Metal water bottles', 'قمقمه‌های فلزی'],
  tshirt: ['File:Drying up printed T-shirts.jpg', 'Freshly printed T-shirts drying', 'تی‌شرت‌های تازه چاپ‌شده در حال خشک شدن'],
  jersey: ['File:Shirt of TPE Football Home 2015.jpg', 'A football shirt', 'پیراهن فوتبال'],
  cushion: ['File:Throw Pillow.JPG', 'A patterned throw cushion', 'کوسن طرح‌دار'],
  panel: [
    'File:Large Format Printing of Black Numbers on a Brushed Aluminum Sheet.jpg',
    'A print on a brushed aluminium sheet',
    'چاپ روی ورق آلومینیوم برس‌خورده',
  ],
  puzzle: ['File:Jigsaw Puzzle - PUPPIES! (16003625276).jpg', 'A photo jigsaw puzzle', 'پازل عکس'],
  phone: ['File:Smartphone with case cover on table.jpg', 'A phone in a case', 'گوشی در قاب'],
  mousepad: ['File:Mousepad designed as a carpet.jpg', 'A printed mouse pad', 'ماوس‌پد چاپ‌شده'],
  coaster: ["File:Mat diod 'Calon Hapus'.jpg", 'A printed coaster', 'زیرلیوانی چاپ‌شده'],
  tehran: ['File:Tehran in a clean day.jpg', 'Tehran on a clear day', 'تهران در روزی صاف'],
  inkPanels: ['File:RGB dye sublimation panels.jpg', 'Dye-sublimation ink panels', 'نوارهای جوهر سابلیمیشن'],
  fabricMachine: ['File:Fabric Printing machine.jpg', 'A fabric printing machine', 'دستگاه چاپ پارچه'],
  // Material swatches
  swJersey: ['File:Singlejersey.jpg', 'Single jersey knit', 'بافت جرسی'],
  swMesh: ['File:Mesh Fabric Texture DTXR-FB-1.jpg', 'Mesh fabric', 'پارچه‌ی مش'],
  swSatin: ['File:Satin bedding.jpg', 'Satin', 'ساتن'],
  swCanvas: ['File:Cloth 800.jpg', 'Rolls of cloth', 'رول‌های پارچه'],
  swFleece: ['File:Antron Fleece.jpg', 'Fleece', 'پولار'],
  swBlend: ['File:Interlockjersey.jpg', 'Interlock jersey', 'جرسی اینترلاک'],
  swCeramic: ['File:Ceramic Tile by White Cloud Farms Pottery. 6x6 in, no date.jpg', 'A glazed ceramic tile', 'کاشی سرامیکی لعاب‌دار'],
  swSteel: ['File:India - Chennai - Stainless Steel shops - 05 (3016122780).jpg', 'Stainless steel pots', 'ظروف فولاد ضدزنگ'],
  swNeoprene: ['File:Diving suit neoprene.jpg', 'Neoprene', 'نئوپرن'],
  swMdf: ['File:Mdf platte.jpg', 'MDF board', 'تخته‌ی ام‌دی‌اف'],
};

const plain = (html) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Each file's 1600 px image, original, Commons page, author and license, in one request per 40 files. */
async function lookup(titles) {
  const info = {};
  for (let i = 0; i < titles.length; i += 40) {
    const u = new URL(API);
    for (const [k, v] of Object.entries({
      action: 'query',
      format: 'json',
      titles: titles.slice(i, i + 40).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiurlwidth: '1600',
    }))
      u.searchParams.set(k, v);
    const res = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Wikimedia Commons answered ${res.status}`);
    const data = await res.json();
    // Commons may normalize titles (spaces, capitals); map them back.
    const back = Object.fromEntries((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      info[back[page.title] ?? page.title] = {
        image: ii.thumburl || ii.url,
        original: ii.url,
        page: ii.descriptionurl,
        author: plain(m.Artist?.value).slice(0, 120) || 'Unknown author',
        license: plain(m.LicenseShortName?.value),
        licenseUrl: m.LicenseUrl?.value ?? '',
        mime: ii.mime,
      };
    }
  }
  return info;
}

const FOLDER = 'FikkoPrint · Commons photos';

/** The media library name of a photo, so a later run finds it again. */
const fileName = (key, title, mime) =>
  `${key}-${title.slice(5, 65).replace(/[^\w.-]+/g, '-')}`.replace(/\.(jpe?g|png)$/i, '') + (mime === 'image/png' ? '.png' : '.jpg');

/**
 * Downloads the photos and uploads them to the site, in a media folder, each with a description that credits it.
 * Photos already in that folder from an earlier run are reused. Returns `{ url, credits }`: the uploaded address of
 * each key, and the credits for the credits page. Photos that cannot be fetched are left out (the page then falls
 * back to drawings) and reported.
 */
export async function fetchCommonsPhotos({ upload, setMedia, listFolder }) {
  const keys = Object.keys(COMMONS_PHOTOS);
  const info = await lookup(keys.map((k) => COMMONS_PHOTOS[k][0]));
  const have = new Map((await listFolder(FOLDER)).map((m) => [m.originalName, m.url]));
  const url = {};
  const credits = [];
  for (const key of keys) {
    const [title, en, fa] = COMMONS_PHOTOS[key];
    const meta = info[title];
    if (!meta || !/^(CC0|CC BY|CC-BY|Public domain|PD)/i.test(meta.license)) {
      console.warn(`skipped ${title}: ${meta ? `license "${meta.license}"` : 'not found'}`);
      continue;
    }
    const name = fileName(key, title, meta.mime);
    try {
      if (!have.has(name)) {
        const res = await fetch(meta.image, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(String(res.status));
        const media = await upload(Buffer.from(await res.arrayBuffer()), name, meta.mime);
        const credit = `${meta.author} · ${meta.license} · Wikimedia Commons`;
        await setMedia(media.id, { folder: FOLDER, alt: { en: `${en}. Photo: ${credit}`, fa: `${fa}. عکس: ${credit}` } });
        have.set(name, media.url);
        // Commons asks for gentle, sequential downloads.
        await new Promise((r) => setTimeout(r, 300));
      }
      url[key] = have.get(name);
      credits.push({ key, title: title.slice(5), en, fa, ...meta, url: url[key] });
    } catch (err) {
      console.warn(`skipped ${title}: ${err.message}`);
    }
  }
  return { url, credits };
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The blocks of the "Photo credits" page: a grid of the photos linking to Commons, then the full list. */
export function creditBlocks(l, credits) {
  const t = (en, fa) => (l === 'en' ? en : fa);
  const list = credits
    .map(
      (c) =>
        `<li><strong>${escHtml(l === 'en' ? c.en : c.fa)}</strong>: “${escHtml(c.title)}”, ${escHtml(c.author)}, ` +
        (c.licenseUrl ? `<a href="${escHtml(c.licenseUrl)}">${escHtml(c.license)}</a>` : escHtml(c.license)) +
        `. <a href="${escHtml(c.page)}">${t('Commons page', 'صفحه در ویکی‌انبار')}</a> · <a href="${escHtml(c.original)}">${t('original file', 'فایل اصلی')}</a></li>`,
    )
    .join('');
  return [
    {
      id: 'credits-intro',
      type: 'text',
      props: {
        title: t('Photo credits', 'اعتبار عکس‌ها'),
        body: t(
          'The photos on this preview are freely licensed pictures from Wikimedia Commons, chosen to show sublimation, printing and printed products. They are not photos of FikkoPrint’s own studio, products or customers. Each one links to its page and original file on Commons, with its author and license.',
          'عکس‌های این پیش‌نمایش تصاویری با مجوز آزاد از ویکی‌انبار (Wikimedia Commons) هستند که برای نشان دادن سابلیمیشن، چاپ و محصولات چاپ‌شده انتخاب شده‌اند. این‌ها عکس استودیو، محصولات یا مشتریان فیکوپرینت نیستند. هر عکس به صفحه و فایل اصلی‌اش در ویکی‌انبار، با نام پدیدآورنده و مجوزش، پیوند دارد.',
        ),
        align: 'start',
      },
    },
    {
      id: 'credits-grid',
      type: 'card-grid',
      props: {
        title: '',
        subtitle: '',
        variant: 'photo',
        columns: '4',
        items: credits.map((c) => ({ image: c.url, title: l === 'en' ? c.en : c.fa, text: `${c.author} · ${c.license}`, link: c.page })),
      },
    },
    {
      id: 'credits-list',
      type: 'rich-text',
      props: { html: `<h2>${t('Every photo, its author and license', 'همه‌ی عکس‌ها، پدیدآورنده و مجوز')}</h2><ul>${list}</ul>` },
    },
  ];
}
