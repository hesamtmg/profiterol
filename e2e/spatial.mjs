// The undplus.com look: the nine Spatial blocks, the "Spatial Yellow" theme and the shaped-buttons header.
import { adminLogin, api, apiToken, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('spatial');
const browser = await launch();
const token = await apiToken();
const before = await api(token, 'GET', '/admin/settings');

const page0 = await api(token, 'POST', '/admin/pages', { name: 'Spatial look', template: 'spatial-studio-home' });
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);
const enSlug = page0.translations.find((t) => t.locale === 'en').slug;
const faSlug = page0.translations.find((t) => t.locale === 'fa').slug;
const types = new Set(page0.translations[0].blocks.map((b) => b.type));
check('template: the shapes home uses all nine blocks', types.size === 9, [...types].join(', '));

// The theme the original uses: yellow, black and white, the shaped-buttons header
await api(token, 'PUT', '/admin/settings', {
  theme: {
    ...before.theme,
    primary: '#ffd64f',
    secondary: '#c9a3f2',
    background: '#ffffff',
    surface: '#ffffff',
    dark: '#000000',
    text: '#000000',
    radius: '0.5rem',
    headerStyle: 'shapes',
    fontEn: 'Outfit',
  },
});
const saved = await api(token, 'GET', '/admin/settings');
check('settings: the shaped header and the Outfit font are kept', saved.theme.headerStyle === 'shapes' && saved.theme.fontEn === 'Outfit');

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: out + 'hero.png' });

const at = (sel, offset = 0) =>
  page.evaluate(([s, o]) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY + o), [sel, offset]);

// Header: fixed, each link in its own shape, white over dark panels and black over light ones
const bar = page.locator('header > div').first();
const ink = () =>
  bar
    .locator('nav a')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
check('header: white shapes over the dark hero', (await ink()) === 'rgb(255, 255, 255)', await ink());
check('header: floats over the giant letters hero', (await bar.evaluate((el) => getComputedStyle(el).position)) === 'fixed');
const shapes = await bar
  .locator('nav a')
  .evaluateAll((els) => els.slice(0, 3).map((e) => getComputedStyle(e).clipPath + '|' + getComputedStyle(e).borderRadius));
check('header: the links take different shapes', new Set(shapes).size === Math.min(3, shapes.length), shapes.join(' / '));

// Giant letters hero: the word glides and the words type themselves
const glide = () => page.locator('.pf-letter-hero .letter-glide').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
const g0 = await glide();
await page.waitForTimeout(700);
check('hero: the giant word glides sideways', (await glide()) !== g0, `${g0} → ${await glide()}`);
const typed = () => page.locator('.pf-letter-hero p').innerText();
const t0 = await typed();
await page.waitForTimeout(2600);
check('hero: the changing words type themselves', (await typed()) !== t0 && /Studio for/.test(t0), `${t0} → ${await typed()}`);

// Words with pictures: a spinning shape and a picture sit inside the lines
await at('.pf-picture-words', -100);
await page.waitForTimeout(1200);
check(
  'words: a shape and a picture sit between the words',
  (await page.locator('.pf-picture-words h2 svg').count()) === 1 &&
    (await page.locator('.pf-picture-words .photo-placeholder').count()) === 1,
);
await page.screenshot({ path: out + 'picture-words.png' });
await at('.pf-picture-words', 40);
await page.waitForTimeout(400);
check('header: black shapes over the white panel', (await ink()) === 'rgb(0, 0, 0)', await ink());

// Shape parade: the row drifts while scrolling
await at('.pf-shape-parade', -300);
await page.waitForTimeout(500);
const row = () => page.locator('.pf-shape-parade [dir=ltr] > div').evaluate((el) => el.style.transform);
const r0 = await row();
await at('.pf-shape-parade', 300);
await page.waitForTimeout(500);
check('parade: the shapes drift while scrolling', (await row()) !== r0, `${r0} → ${await row()}`);
check('parade: six shapes', (await page.locator('.pf-shape-parade svg').count()) === 6);
await page.screenshot({ path: out + 'parade.png' });

// Centered list: the name in the middle of the screen is sharp, the far ones fade
const names = page.locator('.pf-focus-list li');
await names.nth(3).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight / 2 + el.offsetHeight / 2));
await page.waitForTimeout(500);
const opacities = await names.evaluateAll((els) => els.map((e) => Number(e.style.opacity)));
check(
  'list: the middle name is sharpest',
  opacities[3] > 0.9 && opacities[0] < opacities[3] && opacities[6] < opacities[3],
  opacities.join(' '),
);
await page.screenshot({ path: out + 'focus-list.png' });

// Ticker bands: three, gliding; the profiles band has icons
const bands = page.locator('.pf-ticker-band');
check('bands: the logos, profiles and contact bands', (await bands.count()) === 3);
check(
  'bands: they glide',
  (await bands
    .first()
    .locator('section > div')
    .evaluate((el) => getComputedStyle(el).animationName)) === 'slide-x',
);
check('bands: profile links carry their icons', (await bands.nth(1).locator('a svg, a i.mdi').count()) > 0);

// Projects under a big title: the title stays put while the pictures pass
await at('.pf-work-done', 200);
await page.waitForTimeout(600);
const title = page.locator('.pf-work-done h2');
const y0 = (await title.boundingBox()).y;
await at('.pf-work-done', 900);
await page.waitForTimeout(600);
const y1 = (await title.boundingBox()).y;
check('projects: the title stays in the middle while scrolling', Math.abs(y1 - y0) < 4, `${y0} → ${y1}`);
const cards = await page.locator('.pf-work-done h3').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
check('projects: pictures take turns at either side', cards[1] > cards[0] + 300, cards.join(' '));
await page.screenshot({ path: out + 'work-done.png' });

// Paragraph lighting up: more words lit further down
const lit = () => page.locator('.pf-lit-paragraph p > span').evaluateAll((els) => els.filter((e) => e.style.opacity === '1').length);
await at('.pf-lit-paragraph', -700);
await page.waitForTimeout(400);
const l0 = await lit();
await at('.pf-lit-paragraph', -150);
await page.waitForTimeout(400);
check('paragraph: words light up while scrolling', (await lit()) > l0, `${l0} → ${await lit()}`);
check('paragraph: the link goes to the about page', (await page.locator('.pf-lit-paragraph a').getAttribute('href')) === '/en/about');
await page.screenshot({ path: out + 'paragraph.png' });

// Wavy call to action: the O is a shape, the letters hop, the whole thing links
await at('.pf-wave-cta');
await page.waitForTimeout(500);
check('header: black shapes over the yellow panel', (await ink()) === 'rgb(0, 0, 0)', await ink());
const cta = page.locator('.pf-wave-cta');
check(
  'cta: one letter is swapped for a spinning shape',
  (await cta.locator('h2 svg').count()) === 1 && !/O/.test(await cta.locator('h2 [aria-hidden]').first().innerText()),
);
check('cta: it links to the contact block', (await cta.locator('a').first().getAttribute('href')) === '#contact');
check('cta: the bottom edge is wavy', (await cta.locator(':scope > section > svg, svg[preserveAspectRatio=none]').count()) === 1);
await page.screenshot({ path: out + 'wave-cta.png' });

// Pill label footer
await at('.pf-pill-footer');
await page.waitForTimeout(400);
check('footer: the profiles open in a new tab', (await page.locator('.pf-pill-footer a[target=_blank]').count()) === 3);
check('footer: the TikTok icon is drawn', (await page.locator('.pf-pill-footer a[aria-label=tiktok] svg').count()) === 1);
await page.screenshot({ path: out + 'footer.png' });
await page.screenshot({ path: out + 'full.png', fullPage: true });

// ---------- Phones ----------
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone);
await phone.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(800);
check('phone: no page-wide sideways scroll', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= 390);
await phone.screenshot({ path: out + 'phone-hero.png' });
await phone.locator('header button', { hasText: 'Menu' }).click();
await phone.waitForTimeout(1100);
check('phone: the Menu pill opens the full-screen menu', (await phone.locator('[role=dialog]').count()) === 1);
await phone.screenshot({ path: out + 'phone-menu.png' });

// ---------- Right to left ----------
const fa = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(fa);
await fa.goto(`${BASE}/fa/${faSlug}`, { waitUntil: 'networkidle' });
await fa.waitForTimeout(1200);
const logo = await fa.locator('header a').first().boundingBox();
check('rtl: the logo sits on the right', logo.x > 1000);
check('rtl: the Persian words type themselves', /استودیویی برای/.test(await fa.locator('.pf-letter-hero p').innerText()));
await fa.screenshot({ path: out + 'fa-hero.png' });
await fa.evaluate(() => window.scrollTo(0, document.querySelector('.pf-wave-cta').getBoundingClientRect().top + scrollY));
await fa.waitForTimeout(500);
await fa.screenshot({ path: out + 'fa-cta.png' });

// ---------- Editor: the Spatial blocks in the library ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/pages/${page0.id}`, { waitUntil: 'networkidle' });
check('editor: the Spatial category is in the library', (await ad.locator('text=Spatial (shapes and giant letters)').count()) > 0);
await ad.screenshot({ path: out + 'editor.png' });
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
check(
  'theme editor: the shaped-buttons header can be picked',
  (await ad.locator('button[title*="undplus.com"]').getAttribute('aria-pressed')) === 'true',
);

await api(token, 'PUT', '/admin/settings', { theme: before.theme });
await browser.close();
finish();
