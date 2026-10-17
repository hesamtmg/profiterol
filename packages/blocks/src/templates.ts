import { createBlock, getBlock } from './registry.js';
import { themePresets, type ThemeTokens } from './theme.js';
import type { BlockNode } from './types.js';

/** A block in a template: its type, the props that differ from its defaults, and (for layouts) its columns. */
interface TemplateBlock {
  type: string;
  props?: Record<string, unknown>;
  children?: TemplateBlock[][];
}

type Text = { en: string; fa: string };
type ForLocale = (locale: string) => TemplateBlock[];

export interface PageTemplate {
  key: string;
  name: Text;
  description: Text;
  icon: string;
  blocks: ForLocale;
}

export interface SiteTemplate {
  key: string;
  name: Text;
  description: Text;
  /** A theme preset key (see themePresets). */
  theme: string;
  /** Pages to add, in menu order; the first is meant as the home page. One slug for both languages, so menu links work in each. */
  pages: { template: string; name: Text; slug: string }[];
}

const t = (locale: string, text: Text) => (locale === 'fa' ? text.fa : text.en);

/** Template blocks as page blocks: fresh ids, defaults filled in, and the columns layout blocks need. */
export function buildBlocks(list: TemplateBlock[]): BlockNode[] {
  return list.map((b) => {
    const node = createBlock(b.type);
    node.props = { ...node.props, ...b.props };
    if (b.children) node.children = b.children.map(buildBlocks);
    return node;
  });
}

const contactFields = (l: string) => [
  { label: t(l, { en: 'Name', fa: 'نام' }), type: 'text', required: true, options: '', placeholder: '' },
  { label: t(l, { en: 'Email', fa: 'ایمیل' }), type: 'email', required: true, options: '', placeholder: '' },
  { label: t(l, { en: 'Message', fa: 'پیام' }), type: 'textarea', required: true, options: '', placeholder: '' },
];

export const pageTemplates: PageTemplate[] = [
  {
    key: 'blank',
    name: { en: 'Blank', fa: 'خالی' },
    description: { en: 'An empty page.', fa: 'یک صفحه‌ی خالی.' },
    icon: 'mdi-file-outline',
    blocks: () => [],
  },
  {
    key: 'about',
    name: { en: 'About', fa: 'درباره‌ی ما' },
    description: { en: 'Your story, a few numbers and the people behind the work.', fa: 'داستان شما، چند عدد و آدم‌های پشت کار.' },
    icon: 'mdi-account-group-outline',
    blocks: (l) => [
      {
        type: 'statement',
        props: {
          title: t(l, { en: 'We make places people love', fa: 'جاهایی می‌سازیم که مردم دوستشان دارند' }),
          text: t(l, { en: 'A small studio with a long memory for detail.', fa: 'یک استودیوی کوچک با حافظه‌ای بلند برای جزئیات.' }),
          buttonLabel: '',
        },
      },
      {
        type: 'columns',
        props: { count: '2', ratio: 'wide-start', valign: 'center' },
        children: [
          [
            {
              type: 'text',
              props: {
                title: t(l, { en: 'How we started', fa: 'چطور شروع کردیم' }),
                body: t(l, {
                  en: 'Write a few sentences about how the work began and what still drives it.\n\nA second paragraph about the way you work.',
                  fa: 'چند جمله درباره‌ی شروع کار و چیزی که هنوز انگیزه‌ی شماست بنویسید.\n\nپاراگراف دوم درباره‌ی روش کارتان.',
                }),
              },
            },
          ],
          [
            {
              type: 'counters',
              props: {
                title: '',
                items: [
                  { value: 12, prefix: '', suffix: '+', label: t(l, { en: 'Years', fa: 'سال' }) },
                  { value: 340, prefix: '', suffix: '', label: t(l, { en: 'Projects', fa: 'پروژه' }) },
                ],
              },
            },
          ],
        ],
      },
      { type: 'timeline', props: { title: t(l, { en: 'Our story', fa: 'داستان ما' }) } },
      {
        type: 'card-grid',
        props: {
          title: t(l, { en: 'The team', fa: 'تیم' }),
          subtitle: '',
          variant: 'photo',
          items: [1, 2, 3].map((n) => ({
            image: '',
            title: t(l, { en: `Name ${n}`, fa: `نام ${n}` }),
            text: t(l, { en: 'Role', fa: 'سمت' }),
            link: '',
          })),
        },
      },
    ],
  },
  {
    key: 'services',
    name: { en: 'Services', fa: 'خدمات' },
    description: { en: 'What you offer, prices and common questions.', fa: 'آنچه ارائه می‌دهید، قیمت‌ها و پرسش‌های رایج.' },
    icon: 'mdi-briefcase-outline',
    blocks: (l) => [
      {
        type: 'card-grid',
        props: {
          title: t(l, { en: 'What we do', fa: 'کار ما' }),
          subtitle: t(l, { en: 'Three things we do best.', fa: 'سه کاری که بهتر از همه انجام می‌دهیم.' }),
          items: [1, 2, 3].map((n) => ({
            image: '',
            title: t(l, { en: `Service ${n}`, fa: `خدمت ${n}` }),
            text: t(l, { en: 'A short description of this service.', fa: 'توضیح کوتاهی درباره‌ی این خدمت.' }),
            link: '',
          })),
        },
      },
      {
        type: 'pricing',
        props: l === 'fa' ? { title: 'قیمت‌ها', subtitle: 'برنامه‌ای که به کارتان می‌آید را انتخاب کنید.', currency: 'تومان' } : {},
      },
      {
        type: 'faq',
        props: {
          title: t(l, { en: 'Questions', fa: 'پرسش‌ها' }),
          subtitle: '',
          items: [
            {
              q: t(l, { en: 'How long does it take?', fa: 'چقدر طول می‌کشد؟' }),
              a: t(l, { en: 'Usually a few weeks.', fa: 'معمولاً چند هفته.' }),
            },
            {
              q: t(l, { en: 'Can we change the plan later?', fa: 'بعداً می‌توانیم برنامه را عوض کنیم؟' }),
              a: t(l, { en: 'Yes, any time.', fa: 'بله، هر زمان.' }),
            },
          ],
        },
      },
    ],
  },
  {
    key: 'contact',
    name: { en: 'Contact', fa: 'تماس' },
    description: { en: 'A form beside a map, and your details.', fa: 'فرم کنار نقشه، و اطلاعات تماس.' },
    icon: 'mdi-email-outline',
    blocks: (l) => [
      {
        type: 'columns',
        props: { count: '2', stack: 'tablet' },
        children: [
          [
            {
              type: 'contact-form',
              props: {
                title: t(l, { en: 'Write to us', fa: 'برای ما بنویسید' }),
                text: t(l, { en: 'We reply within one working day.', fa: 'تا یک روز کاری پاسخ می‌دهیم.' }),
                fields: contactFields(l),
                submitLabel: t(l, { en: 'Send', fa: 'ارسال' }),
                successMessage: t(l, { en: 'Thank you! We will be in touch soon.', fa: 'ممنون! به‌زودی با شما تماس می‌گیریم.' }),
              },
            },
          ],
          [{ type: 'map', props: { title: t(l, { en: 'Visit us', fa: 'به ما سر بزنید' }), layout: 'card' } }],
        ],
      },
      {
        type: 'contact-footer',
        props: {
          title: t(l, { en: 'Let’s talk', fa: 'بیایید گفتگو کنیم' }),
          text: t(l, { en: 'Or reach us directly.', fa: 'یا مستقیم با ما در تماس باشید.' }),
          copyright: t(l, { en: '© Your company', fa: '© شرکت شما' }),
        },
      },
    ],
  },
  {
    key: 'portfolio-home',
    name: { en: 'Portfolio home', fa: 'خانه‌ی نمونه‌کار' },
    description: {
      en: 'A bold first screen, services, latest projects and questions.',
      fa: 'صفحه‌ی اول پررنگ، خدمات، آخرین پروژه‌ها و پرسش‌ها.',
    },
    icon: 'mdi-home-outline',
    blocks: (l) => [
      {
        type: 'aurora-hero',
        props:
          l === 'fa'
            ? { eyebrow: 'پذیرش پروژه', title: 'ما می‌سازیم', words: 'وب‌سایت، برند، تجربه', text: 'یک استودیوی کوچک طراحی.' }
            : {},
      },
      { type: 'card-grid', props: l === 'fa' ? { title: 'خدمات ما', subtitle: '' } : {} },
      { type: 'collection-list', props: { collection: 'projects', title: t(l, { en: 'Latest work', fa: 'آخرین کارها' }) } },
      { type: 'testimonials', props: l === 'fa' ? { title: 'نظر مشتریان' } : {} },
      { type: 'contact-footer', props: l === 'fa' ? { title: 'بیایید گفتگو کنیم', text: 'برای ما بنویسید.', copyright: '© استودیو' } : {} },
    ],
  },
  {
    key: 'studio-home',
    name: { en: 'Studio home', fa: 'خانه‌ی استودیو' },
    description: {
      en: 'Classic sections: a full-screen video, photo links and a story.',
      fa: 'بخش‌های کلاسیک: ویدئوی تمام‌صفحه، عکس‌های پیونددار و داستان.',
    },
    icon: 'mdi-domain',
    blocks: (l) => [
      {
        type: 'video-cover',
        props: { title: t(l, { en: 'Every project begins with a conversation', fa: 'هر پروژه با یک گفتگو آغاز می‌شود' }) },
      },
      { type: 'triple', props: { title: t(l, { en: 'What we do', fa: 'کار ما' }) } },
      { type: 'side-by-side' },
      {
        type: 'statement',
        props:
          l === 'fa'
            ? { title: 'سرعت، قدرت ماست', text: 'جمله‌ای که خلاصه می‌کند چرا شما را انتخاب کنند.', buttonLabel: 'تماس با ما' }
            : {},
      },
    ],
  },
  {
    key: 'bold-studio-home',
    name: { en: 'Bold studio home', fa: 'خانه‌ی استودیوی جسور' },
    description: {
      en: 'The awakeagency.dev look: huge type, scattered projects, tilted service cards and an "I need…" picker.',
      fa: 'ظاهر awakeagency.dev: حروف بسیار بزرگ، پروژه‌های پراکنده، کارت‌های کج خدمات و انتخابگر «نیاز دارم…».',
    },
    icon: 'mdi-format-letter-case-upper',
    blocks: (l) =>
      l === 'fa'
        ? [
            {
              type: 'type-hero',
              props: {
                lines: [
                  { start: 'ما', end: 'می‌سازیم' },
                  { start: 'سایت‌هایی', end: 'که' },
                  { start: 'به یاد می‌مانند.', end: '' },
                ],
                text: 'یک استودیوی خلاق دیجیتال. سایت‌ها و محصولات وب برای تیم‌هایی که می‌خواهند دیده شوند.',
                placeLabel: 'در:',
                city: 'تهران',
                timeZone: 'Asia/Tehran',
              },
            },
            {
              type: 'blueprint-statement',
              props: {
                paragraphs: [
                  { text: 'ما سایت، هویت برند و محصول دیجیتال طراحی می‌کنیم و می‌سازیم؛ به همان خوبی که به نظر می‌رسند کار می‌کنند.' },
                  { text: 'چه محصولی تازه داشته باشید و چه برندی برای بازسازی، یک تیم آن را از طرح اولیه تا نسخه‌ی زنده پیش می‌برد.' },
                ],
              },
            },
            { type: 'project-scatter', props: { title: 'پروژه‌های ما', anchor: 'projects' } },
            { type: 'project-archive', props: { buttonLabel: 'همه‌ی پروژه‌ها' } },
            {
              type: 'service-stack',
              props: {
                title: 'خدمات',
                anchor: 'services',
                services: [
                  {
                    title: 'توسعه‌ی وب',
                    text: 'با یک جلسه‌ی آشنایی شروع می‌کنیم تا هدف‌ها و زمان‌بندی را بفهمیم، بعد سریع و محکم می‌سازیم.',
                    drawing: 'nodes',
                    buttonLabel: 'بیشتر بدانید',
                    buttonLink: '',
                  },
                  {
                    title: 'طراحی تجربه و رابط کاربری',
                    text: 'بررسی می‌کنیم مردم چطور از محصول شما استفاده می‌کنند و رابطی دلپذیر طراحی می‌کنیم.',
                    drawing: 'circles',
                    buttonLabel: 'بیشتر بدانید',
                    buttonLink: '',
                  },
                  {
                    title: 'برندینگ',
                    text: 'فرایندی گام‌به‌گام که به هویتی ماندگار برای برند شما می‌رسد.',
                    drawing: 'letter',
                    buttonLabel: 'بیشتر بدانید',
                    buttonLink: '',
                  },
                ],
              },
            },
            {
              type: 'need-picker',
              props: {
                lead: 'نیاز دارم به',
                options: [
                  { label: 'توسعه', link: '#contact' },
                  { label: 'طراحی سایت', link: '#contact' },
                  { label: 'برندینگ', link: '#contact' },
                ],
                buttonLabel: 'بعدی',
              },
            },
            {
              type: 'studio-footer',
              props: {
                name: 'استودیو.',
                anchor: 'contact',
                links: [
                  { label: 'خانه', link: '/' },
                  { label: 'خدمات', link: '#services' },
                  { label: 'پروژه‌ها', link: '#projects' },
                ],
                emailLabel: 'تماس با ما',
                copiedText: 'کپی شد',
                placeLabel: 'در',
                city: 'تهران',
                timeZone: 'Asia/Tehran',
                copyright: '© استودیو. همه‌ی حقوق محفوظ است.',
                legal: [{ label: 'حریم خصوصی', link: '' }],
              },
            },
          ]
        : [
            { type: 'type-hero' },
            { type: 'blueprint-statement' },
            { type: 'project-scatter', props: { anchor: 'projects' } },
            { type: 'project-archive' },
            { type: 'service-stack', props: { anchor: 'services' } },
            { type: 'need-picker' },
            { type: 'studio-footer', props: { anchor: 'contact' } },
          ],
  },
  {
    key: 'folio-home',
    name: { en: 'Developer portfolio home', fa: 'خانه‌ی نمونه‌کار توسعه‌دهنده' },
    description: {
      en: 'The mikewilcockdesign.com look: a huge split name, a word ticker, a work list with a sticky preview, close-ups, services and "Let\'s talk".',
      fa: 'ظاهر mikewilcockdesign.com: نامی بسیار بزرگ در دو سو، نوار کلمه‌ها، فهرست کارها با پیش‌نمایش چسبان، نماهای نزدیک، خدمات و «حرف بزنیم».',
    },
    icon: 'mdi-format-letter-spacing-variant',
    blocks: (l) =>
      l === 'fa'
        ? [
            {
              type: 'name-hero',
              props: {
                labelStart: '(نمونه‌کار / ۱۴۰۵)',
                labelMiddle: 'توسعه‌دهنده‌ی خلاق',
                labelEnd: 'تهران، ایران',
                first: 'سارا',
                second: 'احمدی',
                text: 'سایت و اپ‌هایی طراحی می‌کنم و می‌سازم که پر از حرکت‌اند. بیشتر برای استارتاپ‌ها، کسب‌وکارهای کوچک و استودیوهای همکار.',
                hint: '↓ آرام اسکرول کنید',
                buttonLabel: 'دیدن کارها ←',
              },
            },
            {
              type: 'word-ticker',
              props: { words: ['طراحی', 'ساخت', 'حرکت', 'فروشگاه', 'وب‌فلو', 'اپ'].map((text) => ({ text })) },
            },
            {
              type: 'work-index',
              props: {
                label: 'کارهای منتخب',
                period: '۱۴۰۳ — ۱۴۰۵',
                anchor: 'work',
                linkLabel: 'دیدن پروژه ←',
                projects: [
                  {
                    title: 'شهربازی',
                    year: '۱۴۰۵',
                    kind: 'طراحی و ساخت اپ موبایل',
                    note: '(روی iOS و اندروید)',
                    tag: 'اپ',
                    image: '',
                    color: '#3b3f9e',
                    link: '',
                  },
                  {
                    title: 'پاپوش',
                    year: '۱۴۰۴',
                    kind: 'طراحی و ساخت فروشگاه',
                    note: '',
                    tag: 'فروشگاه',
                    image: '',
                    color: '#a9cddb',
                    link: '',
                  },
                  { title: 'نشر نو', year: '۱۴۰۳', kind: 'ساخت با وب‌فلو', note: '', tag: 'وب‌فلو', image: '', color: '#e5202e', link: '' },
                ],
              },
            },
            {
              type: 'close-up-strip',
              props: {
                label: '(از نزدیک)',
                hint: 'بکشید یا اسکرول کنید',
                items: [
                  { image: '', caption: '(۰۱) شهربازی', tag: 'موبایل', color: '#3b3f9e' },
                  { image: '', caption: '(۰۱) شهربازی', tag: 'جزئیات', color: '#2c5aa0' },
                  { image: '', caption: '(۰۲) پاپوش', tag: 'موبایل', color: '#a9cddb' },
                  { image: '', caption: '(۰۳) نشر نو', tag: 'موبایل', color: '#e5202e' },
                ],
              },
            },
            {
              type: 'hello-statement',
              props: {
                label: '(سلام)',
                text: 'من سارا هستم. سایت و اپ‌هایی طراحی می‌کنم و می‌سازم که *حرکت می‌کنند، پاسخ می‌دهند* و کار با آن‌ها لذت دارد. طراحی در فیگما، ساخته با کد، در _تهران._',
              },
            },
            {
              type: 'service-grid',
              props: {
                label: 'کار من',
                linkLabel: 'همه‌ی خدمات ←',
                anchor: 'services',
                services: [
                  { title: 'سایت', text: 'سایت معرفی و نمونه‌کار، طراحی‌شده و ساخته‌شده با حرکت.', link: '' },
                  { title: 'فروشگاه', text: 'فروشگاه اینترنتی ساخته‌شده بر پایه‌ی برند و محصولات شما.', link: '' },
                  { title: 'وب‌فلو', text: 'سایت‌هایی که تیم شما خودش می‌تواند ویرایش کند.', link: '' },
                  { title: 'اپ', text: 'طراحی و توسعه‌ی رابط اپ موبایل، از اولین طرح تا انتشار.', link: '' },
                ],
              },
            },
            {
              type: 'talk-footer',
              props: {
                label: 'ایده‌ای در سر دارید؟',
                title: 'حرف بزنیم',
                anchor: 'contact',
                social: [
                  { label: 'لینکدین', link: 'https://www.linkedin.com/' },
                  { label: 'گیت‌هاب', link: 'https://github.com/' },
                ],
                city: 'تهران',
                timeZone: 'Asia/Tehran',
                topLabel: 'بازگشت به بالا ↑',
              },
            },
          ]
        : [
            { type: 'name-hero' },
            { type: 'word-ticker' },
            { type: 'work-index', props: { anchor: 'work' } },
            { type: 'close-up-strip' },
            { type: 'hello-statement' },
            { type: 'service-grid', props: { anchor: 'services' } },
            { type: 'talk-footer', props: { anchor: 'contact' } },
          ],
  },
];

export function getPageTemplate(key: string) {
  return pageTemplates.find((p) => p.key === key);
}

/** A template's blocks for one language, ready to save. */
export function templateBlocks(key: string, locale: string): BlockNode[] {
  const template = getPageTemplate(key);
  return template ? buildBlocks(template.blocks(locale).filter((b) => getBlock(b.type))) : [];
}

export const siteTemplates: SiteTemplate[] = [
  {
    key: 'portfolio',
    name: { en: 'Portfolio (AMSR look)', fa: 'نمونه‌کار (ظاهر AMSR)' },
    description: {
      en: 'Teal and sand colors, big rounded panels: a home page, About, Services and Contact.',
      fa: 'رنگ‌های فیروزه‌ای و شنی، پنل‌های گرد بزرگ: خانه، درباره، خدمات و تماس.',
    },
    theme: 'amsr-teal',
    pages: [
      { template: 'portfolio-home', name: { en: 'Home', fa: 'خانه' }, slug: 'home' },
      { template: 'about', name: { en: 'About', fa: 'درباره' }, slug: 'about' },
      { template: 'services', name: { en: 'Services', fa: 'خدمات' }, slug: 'services' },
      { template: 'contact', name: { en: 'Contact', fa: 'تماس' }, slug: 'contact' },
    ],
  },
  {
    key: 'studio',
    name: { en: 'Studio (minicms classic)', fa: 'استودیو (کلاسیک minicms)' },
    description: {
      en: 'A calm, minimal look with the classic full-screen sections: home, About and Contact.',
      fa: 'ظاهری آرام و مینیمال با بخش‌های کلاسیک تمام‌صفحه: خانه، درباره و تماس.',
    },
    theme: 'minimal',
    pages: [
      { template: 'studio-home', name: { en: 'Home', fa: 'خانه' }, slug: 'home' },
      { template: 'about', name: { en: 'About', fa: 'درباره' }, slug: 'about' },
      { template: 'contact', name: { en: 'Contact', fa: 'تماس' }, slug: 'contact' },
    ],
  },
  {
    key: 'bold-studio',
    name: { en: 'Bold studio (awakeagency.dev look)', fa: 'استودیوی جسور (ظاهر awakeagency.dev)' },
    description: {
      en: 'Loud red, huge type and the menu-button header: a home page with projects and services, About and Contact.',
      fa: 'قرمز پررنگ، حروف بسیار بزرگ و سربرگ با دکمه‌ی منو: خانه با پروژه‌ها و خدمات، درباره و تماس.',
    },
    theme: 'studio-red',
    pages: [
      { template: 'bold-studio-home', name: { en: 'Home', fa: 'خانه' }, slug: 'home' },
      { template: 'about', name: { en: 'About', fa: 'درباره' }, slug: 'about' },
      { template: 'contact', name: { en: 'Contact', fa: 'تماس' }, slug: 'contact' },
    ],
  },
  {
    key: 'folio',
    name: { en: 'Developer portfolio (mikewilcockdesign.com look)', fa: 'نمونه‌کار توسعه‌دهنده (ظاهر mikewilcockdesign.com)' },
    description: {
      en: 'Near-black pages, huge condensed type, small monospace labels and one soft blue: a home page with work and services, About and Contact.',
      fa: 'صفحه‌های تقریباً سیاه، حروف فشرده‌ی بسیار بزرگ، برچسب‌های ریز تک‌فاصله و یک آبی ملایم: خانه با کارها و خدمات، درباره و تماس.',
    },
    theme: 'folio-night',
    pages: [
      { template: 'folio-home', name: { en: 'Home', fa: 'خانه' }, slug: 'home' },
      { template: 'about', name: { en: 'About', fa: 'درباره' }, slug: 'about' },
      { template: 'contact', name: { en: 'Contact', fa: 'تماس' }, slug: 'contact' },
    ],
  },
];

export function getSiteTemplate(key: string) {
  return siteTemplates.find((s) => s.key === key);
}

export function siteTemplateTheme(key: string): Partial<ThemeTokens> | null {
  const template = getSiteTemplate(key);
  return themePresets.find((p) => p.key === template?.theme)?.theme ?? null;
}
