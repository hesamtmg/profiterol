// The awakeagency.dev look: the seven Studio blocks, the header styles, the header button and the full-screen menu.
import { adminLogin, api, apiToken, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('studio');
const browser = await launch();
const token = await apiToken();
const before = await api(token, 'GET', '/admin/settings');

const page0 = await api(token, 'POST', '/admin/pages', { name: 'Studio look', template: 'bold-studio-home' });
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);
const enSlug = page0.translations.find((t) => t.locale === 'en').slug;
const faSlug = page0.translations.find((t) => t.locale === 'fa').slug;
check('template: the bold studio home uses all seven blocks', page0.translations[0].blocks.length === 7);

// ---------- Site settings: the header button and the header style picker ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
const headerBox = ad.locator('div:has(> h3:has-text("Header button"))');
await headerBox.locator('input[placeholder="English"]').fill('get in touch.');
await headerBox.locator('input[placeholder="فارسی"]').fill('تماس بگیرید.');
await headerBox.locator('input[placeholder="#contact"]').fill('#contact');
await ad.click('button[title*="full-screen menu"]');
check(
  'theme editor: the menu-button header is chosen',
  (await ad.locator('button[title*="full-screen menu"]').getAttribute('aria-pressed')) === 'true',
);
await ad.screenshot({ path: out + 'settings.png', fullPage: true });
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');
const saved = await api(token, 'GET', '/admin/settings');
check(
  'settings: the header button is stored per language',
  saved.header?.ctaLabel?.en === 'get in touch.' && saved.header?.ctaLink === '#contact',
);
check('settings: the header style is stored in the theme', saved.theme.headerStyle === 'studio');
const bad = await fetch(`${BASE}/api/admin/settings`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    header: { ctaLabel: { en: 'x' }, ctaLink: 'javascript:alert(1)' },
    theme: { ...saved.theme, headerStyle: 'nope' },
  }),
});
const cleaned = await api(token, 'GET', '/admin/settings');
check(
  'settings: an unsafe button link and an unknown style are dropped',
  bad.ok && cleaned.header.ctaLink === '' && cleaned.theme.headerStyle === undefined,
);
await api(token, 'PUT', '/admin/settings', { header: saved.header, theme: saved.theme });

// ---------- The page ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
await page.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'hero.png' });

// Header: floats over the big type hero, with the button and the menu button
const header = page.locator('header').first();
check('header: floats over the big type hero', (await header.evaluate((el) => getComputedStyle(el).position)) === 'absolute');
check('header: shows the header button', (await header.locator('a', { hasText: 'get in touch.' }).count()) === 1);
check('hero: every line is there', /WEBSITES/.test(await page.locator('.pf-type-hero h1').innerText()));
check('hero: the local time is shown', /\d\d:\d\d/.test(await page.locator('.pf-type-hero').innerText()));

await header.locator('button', { hasText: 'menu.' }).click();
await page.waitForTimeout(1100);
const dialog = page.locator('[role=dialog]');
check('menu: opens full screen', (await dialog.count()) === 1 && (await dialog.boundingBox()).height >= 880);
check(
  'menu: lists the menu links, numbered',
  (await dialog.locator('nav a').count()) === before.menu.length && (await dialog.locator('nav').innerText()).includes('00'),
);
check('menu: the page behind does not scroll', (await page.evaluate(() => document.documentElement.style.overflow)) === 'hidden');
await page.screenshot({ path: out + 'menu.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
check('menu: Escape closes it', (await dialog.count()) === 0);

const at = (sel, offset = 0) =>
  page.evaluate(([s, o]) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY + o), [sel, offset]);

// Blueprint statement: words light up and the lines draw while scrolling through it
const litWords = () =>
  page.locator('.pf-blueprint-statement p span').evaluateAll((els) => els.filter((e) => e.style.opacity === '1').length);
await at('.pf-blueprint-statement');
await page.waitForTimeout(500);
const lit0 = await litWords();
const square = () =>
  page
    .locator('.pf-blueprint-statement path[d^="M70 440"]')
    .first()
    .evaluate((el) => Number(el.style.strokeDashoffset));
const sq0 = await square();
await at('.pf-blueprint-statement', 900);
await page.waitForTimeout(500);
check('blueprint: more words light up', (await litWords()) > lit0, `${lit0} → ${await litWords()}`);
check('blueprint: the square draws itself', (await square()) < sq0, `${sq0} → ${await square()}`);
check('menu button: stays at the corner after scrolling', await page.locator('.fixed button', { hasText: 'menu.' }).isVisible());
await page.screenshot({ path: out + 'blueprint.png' });

// Scattered projects: two staggered columns, the line drawn as it scrolls
await at('.pf-project-scatter', 300);
await page.waitForTimeout(700);
const cards = await page.locator('.pf-project-scatter h3').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
check('scatter: the cards zigzag in two columns', cards[1].left > cards[0].right && cards[1].top > cards[0].top + 100);
const line = () => page.locator('.pf-project-scatter svg path').evaluate((el) => Number(el.style.strokeDashoffset));
const l0 = await line();
await at('.pf-project-scatter', 1400);
await page.waitForTimeout(400);
check('scatter: the line draws itself', (await line()) < l0, `${l0} → ${await line()}`);
await page.screenshot({ path: out + 'scatter.png' });

// Project archive: the picture follows the mouse only when the row has one (none here), the rows dim
const row = page.locator('.pf-project-archive li').nth(1);
await row.scrollIntoViewIfNeeded();
await row.hover();
await page.waitForTimeout(400);
check(
  'archive: pointing at a row dims the others',
  Number(
    await page
      .locator('.pf-project-archive li > *')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
  ) < 1,
);
await page.screenshot({ path: out + 'archive.png' });

// Tilted service cards: a card that has landed is tilted
await at('.pf-service-stack', 1600);
await page.waitForTimeout(700);
const tilt = await page
  .locator('.pf-service-stack article')
  .first()
  .evaluate((el) => el.style.transform);
check('services: landed cards are tilted', /rotate\(-?[1-9]/.test(tilt), tilt);
await page.screenshot({ path: out + 'services.png' });

// "I need…" picker: turns by itself, a click picks, the button follows the choice. The mouse is moved out of the
// way first: the wheel stops while it is pointed at.
await page.mouse.move(5, 5);
await at('.pf-need-picker', -100);
const chosen = () => page.locator('.pf-need-picker [role=radio][aria-checked=true]').innerText();
const first = await chosen();
await page.waitForTimeout(2600);
check('picker: the wheel turns by itself', (await chosen()) !== first);
await page.locator('.pf-need-picker [role=radio]', { hasText: 'branding' }).click({ force: true });
await page.waitForTimeout(2600);
check('picker: a click picks and stops the wheel', (await chosen()) === 'branding');
check('picker: the button goes to the chosen link', (await page.locator('.pf-need-picker a').getAttribute('href')) === '#contact');
await page.screenshot({ path: out + 'picker.png' });

// Studio footer: the email is copied with one click
await at('.pf-studio-footer');
await page.locator('.pf-studio-footer button', { hasText: 'hello@example.com' }).click();
await page.waitForTimeout(200);
check('footer: clicking the email copies it', (await page.evaluate(() => navigator.clipboard.readText())) === 'hello@example.com');
check('footer: and says so', (await page.locator('.pf-studio-footer [aria-live]').innerText()) === 'Copied to clipboard');
await page.screenshot({ path: out + 'footer.png' });

// ---------- Right to left ----------
const fa = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(fa);
await fa.goto(`${BASE}/fa/${faSlug}`, { waitUntil: 'networkidle' });
await fa.waitForTimeout(1300);
const logo = await fa.locator('header a').first().boundingBox();
check('rtl: the name sits on the right', logo.x > 1000);
check('rtl: the header button speaks Persian', (await fa.locator('header a', { hasText: 'تماس بگیرید.' }).count()) === 1);
await fa.screenshot({ path: out + 'fa-hero.png' });
await fa.locator('header button', { hasText: 'منو.' }).click();
await fa.waitForTimeout(1100);
await fa.screenshot({ path: out + 'fa-menu.png' });

// ---------- Every header style, on a plain page (nothing for the header to float over) ----------
const plain = await api(token, 'POST', '/admin/pages', { name: 'Header styles', template: 'blank' });
await api(token, 'PATCH', `/admin/pages/${plain.id}`, {
  translations: plain.translations.map((t) => ({
    locale: t.locale,
    title: 'Header styles',
    slug: t.slug,
    blocks: [1, 2, 3].map((i) => ({
      id: `hdr-${i}`,
      type: 'text',
      props: { title: `Section ${i}`, body: 'Text. '.repeat(200), align: 'start' },
    })),
  })),
});
await api(token, 'POST', `/admin/pages/${plain.id}/publish`);
const plainSlug = plain.translations.find((t) => t.locale === 'en').slug;
for (const style of ['solid', 'glass', 'centered', 'minimal', 'dock', 'studio']) {
  await api(token, 'PUT', '/admin/settings', { theme: { ...saved.theme, headerStyle: style } });
  for (const [w, h, tag] of [
    [1440, 900, 'desktop'],
    [390, 844, 'phone'],
  ]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    watch(p);
    await p.goto(`${BASE}/en/${plainSlug}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    check(`header ${style} (${tag}): shown`, (await p.locator('header a:visible').count()) > 0);
    await p.screenshot({ path: out + `header-${style}-${tag}.png` });
    if (tag === 'phone' && style !== 'solid' && style !== 'glass') {
      await p.locator('header button').first().click();
      await p.waitForTimeout(1100);
      check(`header ${style} (phone): the menu button opens the full-screen menu`, (await p.locator('[role=dialog]').count()) === 1);
    }
    if (style === 'dock' && tag === 'desktop') {
      const top = () =>
        p
          .locator('header > div')
          .first()
          .evaluate((el) => el.getBoundingClientRect().bottom);
      await p.mouse.wheel(0, 1200);
      await p.waitForTimeout(800);
      check('header dock: slides away while scrolling down', (await top()) <= 0, String(await top()));
      await p.mouse.wheel(0, -300);
      await p.waitForTimeout(800);
      check('header dock: comes back when scrolling up', (await top()) > 0);
    }
    if (style === 'minimal' && tag === 'desktop') {
      const bg = () =>
        p
          .locator('header > div')
          .first()
          .evaluate((el) => getComputedStyle(el).backgroundColor);
      const plain = await bg();
      await p.mouse.wheel(0, 600);
      await p.waitForTimeout(800);
      check('header minimal: gets a background once the page scrolls', (await bg()) !== plain, `${plain} → ${await bg()}`);
    }
    await p.close();
  }
}

// ---------- Editor: the Studio blocks in the library ----------
await ad.goto(`${BASE}/admin/pages/${page0.id}`, { waitUntil: 'networkidle' });
check('editor: the Studio category is in the library', (await ad.locator('text=Studio (bold agency look)').count()) > 0);
await ad.screenshot({ path: out + 'editor.png' });

await api(token, 'PUT', '/admin/settings', { theme: before.theme, header: before.header ?? {} });
await browser.close();
finish();
