import { ADMIN, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('themes');
const browser = await launch();

const cssVar = (p, name) => p.evaluate((n) => getComputedStyle(document.querySelector('.site')).getPropertyValue(n).trim(), name);

// ---------- AMSR page: the original first screen rebuilt with the Spotlight block ----------
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(desk);
await desk.goto(`${BASE}/en/amsr`, { waitUntil: 'networkidle' });
await desk.waitForTimeout(1800);
await desk.screenshot({ path: out + 'amsr-en.png' });
check('AMSR page: name of the first person', (await desk.locator('h1').innerText()) === 'Ali Mazaheri');
check('header floats as glass', (await desk.locator('header .glass').count()) === 1);
check('page theme: black background', (await cssVar(desk, '--c-background')) === '#0d0d0f');
await desk.locator('button[aria-label="Sanaz Riazi"]').hover();
await desk.waitForTimeout(1200);
await desk.screenshot({ path: out + 'amsr-en-hover.png' });
await desk.locator('button[aria-label="Sanaz Riazi"]').click();
await desk.waitForTimeout(1600);
check('clicking the side card switches person', (await desk.locator('h1').innerText()) === 'Sanaz Riazi');
check('the side card now shows Ali', (await desk.locator('button[aria-label="Ali Mazaheri"]').count()) === 1);
await desk.screenshot({ path: out + 'amsr-en-switched.png' });

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone);
await phone.goto(`${BASE}/fa/amsr`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(1800);
await phone.screenshot({ path: out + 'amsr-fa-mobile.png' });
check('Persian name', (await phone.locator('h1').innerText()) === 'علی مظاهری');

// ---------- Seeded home page ----------
await desk.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
await desk.waitForTimeout(1500);
await desk.screenshot({ path: out + 'home-en.png' });
check('home starts with the Spotlight hero', (await desk.locator('h1').first().innerText()) === 'Design studio');
check('home uses the site theme (AMSR Teal)', (await cssVar(desk, '--c-background')) === '#00a998');

// ---------- Editor: Design panel ----------
const ed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ed);
await ed.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ed.fill('input[type=email]', ADMIN.email);
await ed.fill('input[type=password]', ADMIN.password);
await ed.click('button[type=submit]');
await ed.waitForURL(`${BASE}/admin`);
await ed.locator('article', { hasText: 'Home' }).getByText('Edit').click();
await ed.waitForSelector('main [id^=blk-]');
await ed.click('aside >> text=Design');
check('home uses the site theme by default', (await ed.locator('aside >> text=every page').count()) === 1);
await ed.click('button[title="Use the AMSR Night theme"]');
await ed.waitForTimeout(300);
check('canvas updates live to AMSR Night', (await cssVar(ed, '--c-background')) === '#0d0d0f');
await ed.screenshot({ path: out + 'editor-design-site.png' });
await ed.click('header button:has-text("Save")');
await ed.waitForTimeout(1500);
const contact = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await contact.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' });
check('site theme change reaches every page (Contact)', (await cssVar(contact, '--c-background')) === '#0d0d0f');
check('glass header everywhere with AMSR Night', (await contact.locator('header .glass').count()) === 1);

// Contact page gets its own theme
await ed.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await ed
  .locator('article')
  .filter({ has: ed.getByText('Contact', { exact: true }) })
  .getByText('Edit')
  .click();
await ed.waitForSelector('main [id^=blk-]');
await ed.click('aside >> text=Design');
await ed.click('button:has-text("Its own theme")');
await ed.click('button[title="Use the Sand theme"]');
await ed.locator('input[aria-label="Main color"]').evaluate((el) => {
  el.value = '#8a3b12';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await ed.selectOption('#theme-font-en', 'Playfair Display');
await ed.click('button:has-text("Square")');
await ed.waitForTimeout(400);
check('canvas shows the page theme', (await cssVar(ed, '--c-background')) === '#c49a6c' && (await cssVar(ed, '--c-primary')) === '#8a3b12');
check('button shape applied', (await cssVar(ed, '--radius-button')) === '0.25rem');
await ed.screenshot({ path: out + 'editor-design-page.png' });
await ed.click('header button:has-text("Save")');
await ed.waitForTimeout(1500);
await contact.reload({ waitUntil: 'networkidle' });
check('page theme is a draft until published', (await cssVar(contact, '--c-background')) === '#0d0d0f');
await ed.click('header button:has-text("Publish")');
await ed.waitForSelector('header >> text=Live', { timeout: 15000 });
await contact.reload({ waitUntil: 'networkidle' });
check(
  'published page theme is live',
  (await cssVar(contact, '--c-background')) === '#c49a6c' && (await cssVar(contact, '--font-en')).includes('Playfair'),
);
check('its fonts are loaded', (await contact.locator('link[href*="Playfair+Display"]').count()) === 1);
await contact.screenshot({ path: out + 'contact-sand.png' });
await desk.reload({ waitUntil: 'networkidle' });
check('other pages keep the site theme', (await cssVar(desk, '--c-background')) === '#0d0d0f');

// ---------- Site settings uses the same theme editor ----------
await ed.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
check(
  'settings shows AMSR Night as the current site theme',
  (await ed.locator('button[title="Use the AMSR Night theme"].ring-sky-500').count()) === 1,
);
await ed.screenshot({ path: out + 'settings-theme.png', fullPage: true });

await browser.close();
finish();
