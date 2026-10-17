// The mikewilcockdesign.com look: the seven Folio blocks, the Folio Night theme and the header with the local time.
import { adminLogin, api, apiToken, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('folio');
const browser = await launch();
const token = await apiToken();
const before = await api(token, 'GET', '/admin/settings');

const page0 = await api(token, 'POST', '/admin/pages', { name: 'Folio look', template: 'folio-home' });
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);
const enSlug = page0.translations.find((t) => t.locale === 'en').slug;
const faSlug = page0.translations.find((t) => t.locale === 'fa').slug;
check('template: the developer portfolio home uses all seven blocks', page0.translations[0].blocks.length === 7);

// ---------- Site settings: the city and time zone for the header, the clock header style ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
const placeBox = ad.locator('div:has(> h3:has-text("City and local time"))');
await placeBox.locator('input[placeholder="English"]').fill('Manchester, UK');
await placeBox.locator('input[placeholder="فارسی"]').fill('منچستر، بریتانیا');
await placeBox.locator('input[placeholder="Europe/London"]').fill('Europe/London');
await ad.click('button[title*="mikewilcockdesign.com"]');
check(
  'theme editor: the header with the local time is chosen',
  (await ad.locator('button[title*="mikewilcockdesign.com"]').getAttribute('aria-pressed')) === 'true',
);
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');
const saved = await api(token, 'GET', '/admin/settings');
check(
  'settings: the place is stored per language with its time zone',
  saved.header?.place?.en === 'Manchester, UK' && saved.header?.timeZone === 'Europe/London',
);
check('settings: the header style is stored in the theme', saved.theme.headerStyle === 'clock');
await api(token, 'PUT', '/admin/settings', {
  siteName: { ...saved.siteName, en: 'Michael Wilcock' },
  header: { ...saved.header, ctaLabel: { en: 'Start a project', fa: 'شروع پروژه' }, ctaLink: '#contact', timeZone: '</script>' },
});
check('settings: a time zone that is not a zone name is dropped', (await api(token, 'GET', '/admin/settings')).header.timeZone === '');
await api(token, 'PUT', '/admin/settings', {
  header: { ...saved.header, ctaLabel: { en: 'Start a project', fa: 'شروع پروژه' }, ctaLink: '#contact' },
  // The Folio Night theme, as picked from the ready-made themes
  theme: { ...saved.theme, primary: '#7ea2ff', background: '#141414', dark: '#141414', surface: '#ece9e3', fontEn: 'Archivo' },
});

// ---------- The page ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'hero.png' });

const header = page.locator('header').first();
const headerText = await header.innerText();
check('header: shows the city and its local time', /MANCHESTER, UK\s*\/\s*\d\d:\d\d/i.test(headerText), headerText);
check('header: highlights the first letter of the second word', (await header.locator('.bg-primary', { hasText: /^W$/ }).count()) === 1);
check('header: shows the button as a pill', (await header.locator('a.rounded-full', { hasText: /start a project/i }).count()) === 1);
check('header: stays on top while scrolling', (await header.evaluate((el) => getComputedStyle(el).position)) === 'sticky');

const lines = await page
  .locator('.pf-name-hero h1 > span')
  .evaluateAll((els) => els.map((e) => e.firstElementChild.getBoundingClientRect()));
// Where the letters of each line are (the lines themselves are as wide as the page)
const textBoxes = (els) =>
  els.map((e) => {
    const range = document.createRange();
    range.selectNodeContents(e);
    return range.getBoundingClientRect();
  });
const words = await page.locator('.pf-name-hero h1 > span > span').evaluateAll(textBoxes);
check('hero: the name is on two lines', lines.length === 2 && lines[1].top > lines[0].top);
check(
  'hero: the second line ends at the far edge',
  words[1].right > 1300 && words[0].left < 100,
  JSON.stringify(words.map((w) => w.right)),
);

const at = (sel, offset = 0) =>
  page.evaluate(([s, o]) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY + o), [sel, offset]);

// Word ticker: moves on its own
await at('.pf-word-ticker', -300);
const shift = () =>
  page
    .locator('.pf-word-ticker [style*="translateX"]')
    .evaluate((el) => Number(/translateX\((-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? 0));
const t0 = await shift();
await page.waitForTimeout(800);
check('ticker: the words slide on their own', (await shift()) < t0, `${t0} → ${await shift()}`);
await page.screenshot({ path: out + 'ticker.png' });

// Work list: the row in the middle of the screen is lit and its picture shown beside the list
const counter = () => page.locator('.pf-work-index .sticky .text-primary').first().innerText();
await at('.pf-work-index li:nth-child(1)', -300);
await page.waitForTimeout(700);
check('work: the first project is lit to begin with', (await counter()) === '01');
await at('.pf-work-index li:nth-child(3)', -300);
await page.waitForTimeout(700);
check('work: scrolling lights the next ones', (await counter()) === '03', await counter());
const preview = await page.locator('.pf-work-index .sticky').boundingBox();
check('work: the preview stays on screen', preview.y >= 0 && preview.y < 300, String(preview.y));
await page.screenshot({ path: out + 'work.png' });
await page.locator('.pf-work-index li').nth(1).hover();
await page.waitForTimeout(400);
check('work: pointing at a project lights it', (await counter()) === '02');
await page.mouse.move(5, 5);

// Close-up strip: the row can be dragged sideways
await at('.pf-close-up-strip', -100);
await page.waitForTimeout(400);
const strip = page.locator('.pf-close-up-strip .overflow-x-auto');
const box = await strip.boundingBox();
await page.mouse.move(box.x + 900, box.y + 200);
await page.mouse.down();
await page.mouse.move(box.x + 500, box.y + 200, { steps: 8 });
await page.mouse.up();
check(
  'strip: dragging scrolls the row',
  (await strip.evaluate((el) => el.scrollLeft)) > 200,
  String(await strip.evaluate((el) => el.scrollLeft)),
);
await page.screenshot({ path: out + 'strip.png' });

// Hello statement: words light up while scrolling, with italic and colored words
const lit = () => page.locator('.pf-hello-statement p span').evaluateAll((els) => els.filter((e) => e.style.opacity === '1').length);
await at('.pf-hello-statement', -700);
await page.waitForTimeout(400);
const lit0 = await lit();
await at('.pf-hello-statement', 100);
await page.waitForTimeout(400);
check('hello: more words light up', (await lit()) > lit0, `${lit0} → ${await lit()}`);
check('hello: *starred* words are italic', (await page.locator('.pf-hello-statement .italic-word', { hasText: 'respond' }).count()) === 1);
check(
  'hello: _underscored_ words are in the main color',
  (await page.locator('.pf-hello-statement .text-primary', { hasText: 'Manchester.' }).count()) === 1,
);
check('hello: the marks themselves are not shown', !/[*_]/.test(await page.locator('.pf-hello-statement').innerText()));
await page.screenshot({ path: out + 'hello.png' });

// Service grid: four cells in a row on a wide screen
await at('.pf-service-grid', -100);
await page.waitForTimeout(300);
const cells = await page.locator('.pf-service-grid li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
check('services: four cells side by side', cells.length === 4 && new Set(cells).size === 1, JSON.stringify(cells));
await page.screenshot({ path: out + 'services.png' });

// "Let's talk" footer: rises in, mails, shows the time and goes back to the top
await at('.pf-talk-footer');
await page.waitForTimeout(1300);
const footer = page.locator('.pf-talk-footer');
check(
  'footer: the big words lead to the email',
  (await footer.locator('a', { hasText: "LET'S TALK" }).getAttribute('href')) === 'mailto:hello@example.com',
);
check('footer: the big words have risen in', (await footer.locator('.translate-y-0').count()) === 1);
check('footer: shows the local time', /Manchester\s+\d\d:\d\d/i.test(await footer.innerText()));
await page.screenshot({ path: out + 'footer.png' });
await footer.locator('a', { hasText: /back to top/i }).click();
await page.waitForTimeout(1500);
check('footer: back to top scrolls up', (await page.evaluate(() => scrollY)) < 5);

// ---------- Phones ----------
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone);
await phone.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(1300);
check('phone: no sideways scrolling', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= 390);
await phone.screenshot({ path: out + 'phone.png', fullPage: true });
await phone.locator('header button').first().click();
await phone.waitForTimeout(1100);
check('phone: the header opens the full-screen menu', (await phone.locator('[role=dialog]').count()) === 1);

// ---------- Right to left ----------
const fa = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(fa);
await fa.goto(`${BASE}/fa/${faSlug}`, { waitUntil: 'networkidle' });
await fa.waitForTimeout(1300);
const faWords = await fa.locator('.pf-name-hero h1 > span > span').evaluateAll(textBoxes);
check('rtl: the first line starts on the right', faWords[0].right > 1300);
check('rtl: the header shows the Persian place', (await fa.locator('header', { hasText: 'منچستر، بریتانیا' }).count()) === 1);
await fa.screenshot({ path: out + 'fa-hero.png' });
await fa.evaluate(() => window.scrollTo(0, document.querySelector('.pf-hello-statement').getBoundingClientRect().top + scrollY + 100));
await fa.waitForTimeout(500);
await fa.screenshot({ path: out + 'fa-hello.png' });

// ---------- Editor: the Folio blocks in the library ----------
await ad.goto(`${BASE}/admin/pages/${page0.id}`, { waitUntil: 'networkidle' });
check('editor: the Folio category is in the library', (await ad.locator('text=Folio (dark developer portfolio)').count()) > 0);
await ad.screenshot({ path: out + 'editor.png' });

await api(token, 'PUT', '/admin/settings', { theme: before.theme, header: before.header ?? {}, siteName: before.siteName });
await browser.close();
finish();
