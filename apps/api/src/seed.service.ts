import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createBlock, defaultTheme, type BlockNode } from '@profiterol/blocks';
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
          { label: { fa: 'پرسش‌ها', en: 'FAQ' }, href: '#faq' },
          { label: { fa: 'تماس', en: 'Contact' }, href: '#contact' },
        ],
        maintenanceText: { fa: 'به زودی برمی‌گردیم.', en: 'We will be back soon.' },
      });
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
}
