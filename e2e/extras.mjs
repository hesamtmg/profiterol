// Uploaded fonts, saved themes, the page loader, section scrolling, pricing, map and spacer.
import { ADMIN, API, apiToken, BASE, check, finish, fixtures, launch, shots, watch } from './lib.mjs';

const out = shots('extras');
const browser = await launch();

// ---------- Site settings: font upload, loader, saved theme ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad, /400 \(Bad Request\)|openstreetmap/);
ad.on('dialog', (d) => d.accept('My look'));
await ad.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ad.fill('input[type=email]', ADMIN.email);
await ad.fill('input[type=password]', ADMIN.password);
await ad.click('button[type=submit]');
await ad.waitForURL(`${BASE}/admin`);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });

await ad.setInputFiles('input[aria-label="Font file"]', fixtures.fakeFont);
await ad.fill('input[aria-label="Font name"]', 'Fake');
await ad.click('button:has-text("Upload font")');
await ad.waitForTimeout(800);
check('fonts: a fake font file is refused', (await ad.locator('text=do not match its type').count()) === 1);

await ad.setInputFiles('input[aria-label="Font file"]', fixtures.font);
await ad.fill('input[aria-label="Font name"]', 'Brand');
await ad.selectOption('select[aria-label="Weight"]', '700');
await ad.click('button:has-text("Upload font")');
await ad.waitForSelector('text=Brand · Aa Bb', { timeout: 10000 });
check('fonts: uploaded font is listed with a sample', (await ad.locator('text=Bold').count()) >= 1);

await ad.check('text=Show a loading screen');
await ad.fill('input[maxlength="120"] >> nth=1', 'Loading the studio…').catch(() => undefined);
const enText = ad.locator('label:has-text("Line under the counter (English)") + input');
if (await enText.count()) await enText.fill('Loading the studio…');
await ad.click('button:has-text("Preview")');
await ad.waitForTimeout(500);
check('loader: preview plays in settings', (await ad.locator('.site-loader').count()) === 1);
await ad.screenshot({ path: out + 'settings-loader-preview.png' });

await ad.selectOption('#theme-font-en', 'Brand');
check('fonts: uploaded font offered in the theme', (await ad.locator('#theme-font-en optgroup[label="Uploaded"] option').count()) === 1);
await ad.click('button:has-text("Save current")');
await ad.waitForTimeout(200);
check('saved themes: tile added', (await ad.locator('button[title="Use your My look theme"]').count()) === 1);
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');
await ad.screenshot({ path: out + 'settings-fonts.png', fullPage: true });
const saved = await (await fetch(`${API}/public/settings`)).json();
check('settings stored: font, saved theme, loader', saved.fonts?.[0]?.name === 'Brand' && saved.savedThemes?.[0]?.name === 'My look' && saved.loader?.enabled === true && saved.theme.fontEn === 'Brand');

// ---------- Public site: loader and font ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pub = await ctx.newPage();
watch(pub, /400 \(Bad Request\)|openstreetmap/);
await pub.goto(`${BASE}/en`);
await pub.waitForTimeout(250);
check('loader: covers the first page of a visit', await pub.locator('.site-loader').isVisible());
await pub.screenshot({ path: out + 'loader-first-paint.png' });
await pub.waitForSelector('.site-loader', { state: 'detached', timeout: 10000 }).catch(() => null);
check('loader: goes away once the page has loaded', (await pub.locator('.site-loader').count()) === 0);
check('fonts: @font-face served with the page', (await pub.content()).includes("font-family:'Brand'"));
check('fonts: theme uses the uploaded font', (await pub.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-en'))).includes('Brand'));
await pub.evaluate(() => document.fonts.ready);
check('fonts: the browser loaded it', await pub.evaluate(() => document.fonts.check("700 16px 'Brand'")));
await pub.goto(`${BASE}/en/extras`, { waitUntil: 'networkidle' });
check('loader: not shown again in the same visit', await pub.evaluate(() => document.documentElement.classList.contains('loader-seen') && !document.querySelector('.site-loader')?.checkVisibility?.()));

// ---------- Section scrolling ----------
await pub.waitForTimeout(500);
check('sections: page snaps by section', (await pub.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).startsWith('y'));
const counter = () => pub.locator('nav .section-pill span.font-mono').innerText();
check('sections: bar shows where you are', (await counter()).startsWith('01 /'));
await pub.screenshot({ path: out + 'sections-bar.png' });
await pub.click('button[aria-label="Next section"]');
await pub.waitForTimeout(1200);
check('sections: next button moves on', (await counter()).startsWith('02 /'), await counter());
check('sections: title taken from the section heading', (await pub.locator('nav .section-pill span.truncate').innerText()).includes('Simple pricing'));
check('sections: dots for every section', (await pub.locator('ol[aria-label="Go to section"] button').count()) === 6);
await pub.locator('ol[aria-label="Go to section"] button').nth(5).click();
await pub.waitForTimeout(1500);
check('sections: dots jump to a section', (await counter()).startsWith('06 /'), await counter());

// ---------- Pricing, map, spacer ----------
await pub.evaluate(() => document.getElementById('x2').scrollIntoView());
await pub.waitForTimeout(500);
const businessPrice = () => pub.locator('#x2 article').nth(1).locator('.text-5xl').innerText();
check('pricing: monthly price', (await businessPrice()) === '29');
await pub.click('#x2 button[role=radio]:has-text("Yearly")');
await pub.waitForTimeout(600);
check('pricing: yearly switch changes prices', (await businessPrice()) === '290');
check('pricing: not-included features are struck through', (await pub.locator('#x2 li.line-through').count()) === 1);
await pub.screenshot({ path: out + 'pricing.png' });
const src = await pub.locator('#x6 iframe').getAttribute('src');
check('map: OpenStreetMap embed with a pin', src.startsWith('https://www.openstreetmap.org/export/embed.html') && src.includes('marker=35.72190,51.33470'));
check('map: directions link', (await pub.locator('#x6 a[href^="https://www.google.com/maps/search/"]').count()) === 1);
await pub.evaluate(() => document.getElementById('x6').scrollIntoView());
await pub.waitForTimeout(800);
await pub.screenshot({ path: out + 'map.png' });
check('spacer: wave shape', (await pub.locator('#x3 svg path').count()) === 1);

// ---------- Editor: saved theme and uploaded font ----------
await ad.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await ad.locator('article', { hasText: 'Extras' }).getByText('Edit').click();
await ad.waitForSelector('main [id^=blk-]');
await ad.click('aside >> text=Design');
check('editor: your saved theme is offered', (await ad.locator('button[title="Use your My look theme"]').count()) === 1);
check('editor: uploaded font in the font list', (await ad.locator('#theme-font-en optgroup[label="Uploaded"] option').count()) === 1);
check('editor: page scrolling setting shown', (await ad.locator('#theme-scroll').inputValue()) === 'sections');
await ad.screenshot({ path: out + 'editor-design.png' });

// ---------- Phone, Persian ----------
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone, /400 \(Bad Request\)|openstreetmap/);
await phone.goto(`${BASE}/fa/extras`, { waitUntil: 'networkidle' });
await phone.waitForSelector('.site-loader', { state: 'detached', timeout: 10000 }).catch(() => null);
await phone.waitForTimeout(500);
await phone.screenshot({ path: out + 'fa-mobile-sections.png' });
await phone.evaluate(() => document.getElementById('x2').scrollIntoView());
await phone.waitForTimeout(800);
await phone.screenshot({ path: out + 'fa-mobile-pricing.png' });
check('phone: Persian counter in the bar', /[۰-۹]/.test(await phone.locator('nav .section-pill span.font-mono').innerText()));
check('phone: no sideways scrolling', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// Reduced motion: no loader
const calm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await calm.goto(`${BASE}/en`);
await calm.waitForTimeout(300);
check('reduced motion: no loader', !(await calm.locator('.site-loader').first().isVisible().catch(() => false)));

// Put the site settings back for the other test suites.
await fetch(`${API}/admin/settings`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${await apiToken()}` }, body: JSON.stringify({ theme: {}, loader: { enabled: false } }) });

await browser.close();
finish();
