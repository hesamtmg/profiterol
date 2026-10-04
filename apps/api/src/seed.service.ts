import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createBlock, defaultTheme, type BlockNode } from '@profiterol/blocks';
import { cleanFieldDef } from '@profiterol/blocks';
import { CollectionsService } from './collections/collections.service';
import { config } from './config';
import { PagesService } from './pages/pages.service';
import { SettingsService } from './settings/settings.controller';
import { UsersService } from './users/users.service';

function block(type: string, props: Record<string, unknown>): BlockNode {
  const node = createBlock(type);
  return { ...node, props: { ...node.props, ...props } };
}

const homeEn: BlockNode[] = [
  block('hero-cards', {
    marquee: 'BUILD BEAUTIFUL WEBSITES WITHOUT CODE',
    cards: [
      {
        title: 'Design studio',
        text: 'Drag blocks onto the page, edit them in place and publish in one click.',
        image: '',
        letter: 'D',
        color: '#00a998',
        buttonLabel: 'See our work',
        buttonLink: '#services',
      },
      {
        title: 'Content team',
        text: 'Write once per language. Persian pages flow right to left automatically.',
        image: '',
        letter: 'C',
        color: '#c49a6c',
        buttonLabel: 'Contact us',
        buttonLink: '#contact',
      },
    ],
  }),
  block('card-grid', {
    anchor: 'services',
    title: 'What you can build',
    subtitle: 'Every section of this page is a block you can add, reorder and edit from the admin panel.',
    columns: '3',
    variant: 'raised',
    items: [
      { image: '', title: 'Portfolios', text: 'Show projects as cards with photos and links.', link: '' },
      { image: '', title: 'Company sites', text: 'Services, team, FAQ and contact in minutes.', link: '' },
      { image: '', title: 'Landing pages', text: 'A bold hero, a statement and a clear call to action.', link: '' },
      { image: '', title: 'Two languages', text: 'Persian and English side by side, each with its own URL.', link: '' },
      { image: '', title: 'Your brand', text: 'Pick colors, corner radius and fonts in the theme settings.', link: '' },
      { image: '', title: 'Fast pages', text: 'Server-rendered with Nuxt, so pages load fast and rank well.', link: '' },
    ],
  }),
  block('collection-list', {
    anchor: 'projects',
    title: 'Recent projects',
    subtitle: 'Projects come from the Projects collection. Add one in the admin and it shows up here.',
    collection: 'projects',
    variant: 'photo',
    columns: '3',
    limit: 3,
    showFilters: true,
    buttonLabel: 'All projects',
  }),
  block('statement', {
    title: 'Speed is our key power',
    text: 'From an empty page to a published site in an afternoon.',
    buttonLabel: 'Start building',
    buttonLink: '/admin',
  }),
  block('faq', {
    anchor: 'faq',
    title: 'Questions',
    subtitle: 'Things people usually ask before they start.',
    items: [
      { q: 'Do I need to code?', a: 'No. Pick blocks from the library and fill in the fields.' },
      { q: 'Can I add another language?', a: 'Yes. Languages are defined in one place and every page gets a version per language.' },
      { q: 'Where is my data stored?', a: 'In your own Postgres database, running in Docker next to the site.' },
    ],
  }),
  block('contact-footer', {
    anchor: 'contact',
    title: 'Let’s build something',
    text: 'Tell us about your project.',
    email: 'hello@example.com',
    phone: '+98 21 0000 0000',
    address: 'Tehran, Iran',
    copyright: '© Profiterol',
  }),
];

const homeFa: BlockNode[] = [
  block('hero-cards', {
    marquee: 'ساخت وب‌سایت زیبا بدون کدنویسی',
    cards: [
      {
        title: 'استودیو طراحی',
        text: 'بلوک‌ها را روی صفحه بکشید، همان‌جا ویرایش کنید و با یک کلیک منتشر کنید.',
        image: '',
        letter: 'د',
        color: '#00a998',
        buttonLabel: 'نمونه کارها',
        buttonLink: '#services',
      },
      {
        title: 'تیم محتوا',
        text: 'برای هر زبان یک بار بنویسید. صفحه‌های فارسی خودکار راست‌به‌چپ می‌شوند.',
        image: '',
        letter: 'م',
        color: '#c49a6c',
        buttonLabel: 'تماس با ما',
        buttonLink: '#contact',
      },
    ],
  }),
  block('card-grid', {
    anchor: 'services',
    title: 'چه چیزی می‌توانید بسازید',
    subtitle: 'هر بخش این صفحه یک بلوک است که از پنل مدیریت اضافه، جابه‌جا و ویرایش می‌شود.',
    columns: '3',
    variant: 'raised',
    items: [
      { image: '', title: 'نمونه‌کار', text: 'پروژه‌ها را به شکل کارت با عکس و لینک نشان دهید.', link: '' },
      { image: '', title: 'سایت شرکتی', text: 'خدمات، تیم، پرسش‌ها و تماس در چند دقیقه.', link: '' },
      { image: '', title: 'صفحه فرود', text: 'یک بخش اصلی جذاب، یک پیام و یک دعوت به اقدام.', link: '' },
      { image: '', title: 'دو زبانه', text: 'فارسی و انگلیسی کنار هم، هر کدام با آدرس خودش.', link: '' },
      { image: '', title: 'برند شما', text: 'رنگ‌ها، گردی گوشه‌ها و فونت را در تنظیمات قالب انتخاب کنید.', link: '' },
      { image: '', title: 'صفحه‌های سریع', text: 'رندر سمت سرور با Nuxt برای سرعت و سئوی بهتر.', link: '' },
    ],
  }),
  block('collection-list', {
    anchor: 'projects',
    title: 'پروژه‌های اخیر',
    subtitle: 'پروژه‌ها از مجموعه «پروژه‌ها» می‌آیند. در پنل مدیریت یکی اضافه کنید تا اینجا نمایش داده شود.',
    collection: 'projects',
    variant: 'photo',
    columns: '3',
    limit: 3,
    showFilters: true,
    buttonLabel: 'همه پروژه‌ها',
  }),
  block('statement', {
    title: 'سرعت، قدرت ماست',
    text: 'از یک صفحه خالی تا سایت منتشرشده در یک بعدازظهر.',
    buttonLabel: 'شروع کنید',
    buttonLink: '/admin',
  }),
  block('faq', {
    anchor: 'faq',
    title: 'پرسش‌های متداول',
    subtitle: 'سوال‌هایی که معمولا قبل از شروع پرسیده می‌شود.',
    items: [
      { q: 'آیا باید کدنویسی بلد باشم؟', a: 'خیر. بلوک‌ها را از کتابخانه انتخاب کنید و فیلدها را پر کنید.' },
      { q: 'می‌توانم زبان دیگری اضافه کنم؟', a: 'بله. زبان‌ها در یک جا تعریف می‌شوند و هر صفحه برای هر زبان نسخه‌ای دارد.' },
      { q: 'داده‌های من کجا ذخیره می‌شود؟', a: 'در پایگاه داده Postgres خودتان که در داکر کنار سایت اجرا می‌شود.' },
    ],
  }),
  block('contact-footer', {
    anchor: 'contact',
    title: 'بیایید چیزی بسازیم',
    text: 'درباره پروژه‌تان برای ما بنویسید.',
    email: 'hello@example.com',
    phone: '۰۲۱-۰۰۰۰۰۰۰۰',
    address: 'تهران، ایران',
    copyright: '© پروفیترول',
  }),
];

/** On first start, creates the admin user, default settings and a demo home page. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private readonly users: UsersService,
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
    private readonly collections: CollectionsService,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.users.count()) === 0) {
      await this.users.create(config.adminEmail, config.adminPassword, 'admin', 'Admin');
      this.log.log(`Created admin user ${config.adminEmail}`);
    }

    const settings = await this.settings.get();
    if (!settings.siteName?.en) {
      await this.settings.update({
        siteName: { fa: 'پروفیترول', en: 'Profiterol' },
        theme: defaultTheme,
        menu: [
          { label: { fa: 'خدمات', en: 'Services' }, href: '#services' },
          { label: { fa: 'پروژه‌ها', en: 'Projects' }, href: '#projects' },
          { label: { fa: 'پرسش‌ها', en: 'FAQ' }, href: '#faq' },
          { label: { fa: 'تماس', en: 'Contact' }, href: '#contact' },
        ],
        maintenanceText: { fa: 'به زودی برمی‌گردیم.', en: 'We will be back soon.' },
      });
    }

    if ((await this.collections.listCollections()).length === 0) {
      await this.seedCollections();
      this.log.log('Created the demo Projects and Blog collections');
    }

    if ((await this.pages.list()).length === 0) {
      const home = await this.pages.create({
        name: 'Home',
        isHome: true,
        translations: [
          { locale: 'en', title: 'Home', slug: 'home', seoDescription: 'Built with Profiterol', blocks: homeEn },
          { locale: 'fa', title: 'خانه', slug: 'خانه', seoDescription: 'ساخته شده با پروفیترول', blocks: homeFa },
        ],
      });
      await this.pages.publish(home.id);
      this.log.log('Created the demo home page');
    }
  }

  private async seedCollections() {
    const projects = await this.collections.createCollection({
      key: 'projects',
      name: { en: 'Projects', fa: 'پروژه‌ها' },
      slugs: { en: 'projects', fa: 'پروژه‌ها' },
      fields: [
        { key: 'client', label: 'Client', type: 'text', labels: { fa: 'کارفرما' } },
        { key: 'year', label: 'Year', type: 'text', labels: { fa: 'سال' } },
        { key: 'website', label: 'Website', type: 'url', labels: { fa: 'وب‌سایت' } },
        cleanFieldDef({ key: 'gallery', label: 'Gallery', type: 'list', labels: { fa: 'گالری' } }),
      ],
    });
    const blog = await this.collections.createCollection({
      key: 'blog',
      name: { en: 'Blog', fa: 'وبلاگ' },
      slugs: { en: 'blog', fa: 'وبلاگ' },
      fields: [{ key: 'author', label: 'Author', type: 'text', labels: { fa: 'نویسنده' } }],
    });

    for (const p of demoProjects) await this.seedItem(projects.id, p);
    for (const p of demoPosts) await this.seedItem(blog.id, p);
  }

  private async seedItem(collectionId: string, demo: DemoItem) {
    const item = await this.collections.createItem(collectionId, { title: demo.en.title });
    await this.collections.updateItem(collectionId, item.id, {
      translations: (['en', 'fa'] as const).map((locale) => ({ locale, ...demo[locale] })),
    });
    await this.collections.setStatus(collectionId, item.id, true);
  }
}

interface DemoText {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string[];
  data: Record<string, unknown>;
}
type DemoItem = Record<'en' | 'fa', DemoText>;

const demoProjects: DemoItem[] = [
  {
    en: {
      title: 'Harbor customs portal',
      slug: 'harbor-customs-portal',
      excerpt: 'A bilingual portal that cut customs clearance from days to hours.',
      body: 'The client needed importers to track every shipment in one place.\n\nWe designed a card-based dashboard and a bilingual public site, then connected it to their clearance system.',
      tags: ['Web app', 'Branding'],
      data: { client: 'AMSR Trading', year: '2025', website: 'https://example.com', gallery: [] },
    },
    fa: {
      title: 'پورتال گمرکی بندر',
      slug: 'پورتال-گمرکی-بندر',
      excerpt: 'پورتالی دو زبانه که ترخیص کالا را از چند روز به چند ساعت رساند.',
      body: 'مشتری می‌خواست واردکنندگان همه محموله‌ها را در یک جا پیگیری کنند.\n\nیک داشبورد کارتی و یک سایت دو زبانه طراحی کردیم و آن را به سامانه ترخیص وصل کردیم.',
      tags: ['اپلیکیشن وب', 'برندینگ'],
      data: { client: 'گروه بازرگانی AMSR', year: '۱۴۰۴', website: 'https://example.com', gallery: [] },
    },
  },
  {
    en: {
      title: 'Studio portfolio',
      slug: 'studio-portfolio',
      excerpt: 'Full-screen scrolling portfolio for an architecture studio.',
      body: 'Large photography, slow transitions and a page per project.\n\nThe team now publishes new work themselves from the admin panel.',
      tags: ['Website'],
      data: { client: 'Mokhtari Studio', year: '2024', website: '', gallery: [] },
    },
    fa: {
      title: 'نمونه‌کار استودیو',
      slug: 'نمونه-کار-استودیو',
      excerpt: 'نمونه‌کار تمام‌صفحه برای یک استودیوی معماری.',
      body: 'عکس‌های بزرگ، انتقال‌های آرام و یک صفحه برای هر پروژه.\n\nتیم حالا خودش کارهای جدید را از پنل مدیریت منتشر می‌کند.',
      tags: ['وب‌سایت'],
      data: { client: 'استودیو مختاری', year: '۱۴۰۳', website: '', gallery: [] },
    },
  },
  {
    en: {
      title: 'Coffee brand identity',
      slug: 'coffee-brand-identity',
      excerpt: 'Logo, packaging and a small online shop for a local roaster.',
      body: 'A warm palette taken from the roasting process, and packaging that works in both Persian and English.',
      tags: ['Branding'],
      data: { client: 'Ghahve Roasters', year: '2024', website: '', gallery: [] },
    },
    fa: {
      title: 'هویت بصری برند قهوه',
      slug: 'هویت-بصری-برند-قهوه',
      excerpt: 'لوگو، بسته‌بندی و یک فروشگاه آنلاین کوچک برای یک برشته‌کار محلی.',
      body: 'رنگ‌هایی گرم برگرفته از فرایند برشته‌کاری و بسته‌بندی‌ای که به هر دو زبان فارسی و انگلیسی کار می‌کند.',
      tags: ['برندینگ'],
      data: { client: 'قهوه‌خانه برشته', year: '۱۴۰۳', website: '', gallery: [] },
    },
  },
];

const demoPosts: DemoItem[] = [
  {
    en: {
      title: 'Why we build bilingual sites from day one',
      slug: 'bilingual-from-day-one',
      excerpt: 'Adding a second language later costs far more than planning for it.',
      body: 'Right-to-left layouts touch every component.\n\nWhen each page has a version per language from the start, translating is just writing.',
      tags: ['Process'],
      data: { author: 'Profiterol team' },
    },
    fa: {
      title: 'چرا از روز اول سایت دو زبانه می‌سازیم',
      slug: 'دو-زبانه-از-روز-اول',
      excerpt: 'اضافه کردن زبان دوم در آینده خیلی گران‌تر از برنامه‌ریزی از ابتداست.',
      body: 'چیدمان راست‌به‌چپ روی همه اجزا اثر می‌گذارد.\n\nوقتی هر صفحه از ابتدا برای هر زبان نسخه‌ای دارد، ترجمه فقط نوشتن است.',
      tags: ['فرایند'],
      data: { author: 'تیم پروفیترول' },
    },
  },
];
