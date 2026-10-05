// Page templates, whole-site templates, and saved sections.
import { api, apiToken, BASE, adminLogin, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('templates');
const browser = await launch();
const token = await apiToken();
const before = await api(token, 'GET', '/admin/settings');
const pagesBefore = new Set((await api(token, 'GET', '/admin/pages')).map((p) => p.id));
for (const s of await api(token, 'GET', '/admin/sections')) await api(token, 'DELETE', `/admin/sections/${s.key}`);

const page = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }));
page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Contact row') : d.accept()));
await adminLogin(page);

// A page from the Contact template.
await page.click('button:has-text("From a template")');
await page.waitForSelector('[role=dialog] [data-template=contact]');
await page.click('[role=dialog] [data-template=contact]');
check('the page name follows the template', (await page.inputValue('#template-page-name')) === 'Contact');
await page.fill('#template-page-name', 'Contact us');
await page.screenshot({ path: out + 'picker.png' });
await page.click('[role=dialog] button:has-text("Create page")');
await page.waitForURL(/\/admin\/pages\//);
await page.waitForSelector('main [data-type=columns]');
check(
  'the template’s columns, form and map are there',
  (await page.locator('main [data-type=contact-form]').count()) === 1 && (await page.locator('main [data-type=map]').count()) === 1,
);
check(
  'in Persian too',
  await page
    .locator('main >> text=برای ما بنویسید')
    .count()
    .then((n) => n === 1),
);
await page.click('header button:has-text("English")');
check('and in English', (await page.locator('main >> text=Write to us').count()) === 1);

// Save the columns as a section, then insert it again from the library.
await page
  .locator('main [data-type=columns]')
  .first()
  .hover({ position: { x: 300, y: 300 } });
await page.locator('main [data-type=columns] .drag-handle').first().click();
await page.click('aside >> button[title="Save as a section to reuse on other pages"]');
await page.waitForSelector('[data-sections] >> text=Contact row');
check('the saved section is in the library', true);
await page.locator('[data-sections] button:has-text("Contact row")').click();
await page.waitForTimeout(300);
check(
  'inserting it adds a copy',
  (await page.locator('main [data-type=columns]').count()) === 2 && (await page.locator('main [data-type=contact-form]').count()) === 2,
);
const ids = await page.evaluate(() => [...document.querySelectorAll('main [id^=blk-]')].map((e) => e.id));
check('the copy has its own ids', new Set(ids).size === ids.length);
await page.screenshot({ path: out + 'section-inserted.png' });
await page.click('header button:has-text("Save")');
await page.waitForTimeout(800);

// A whole-site template from Site settings.
await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
await page.locator('[data-site-templates] [data-template=studio] button:has-text("Use this template")').click();
await page.waitForSelector('[data-site-templates] [role=status]');
const added = await page.locator('[data-site-templates] [role=status] li').allInnerTexts();
check('the site template adds its pages', added.join('|') === 'Home|About|Contact', added.join('|'));
await page.locator('[data-site-templates]').screenshot({ path: out + 'site-template.png' });
const settings = await api(token, 'GET', '/admin/settings');
check(
  'and its menu links',
  settings.menu.some((m) => m.label.en === 'About' && m.label.fa === 'درباره'),
);
check('and its theme', JSON.stringify(settings.theme) !== JSON.stringify(before.theme));

// Put things back for the other suites.
for (const p of await api(token, 'GET', '/admin/pages')) if (!pagesBefore.has(p.id)) await api(token, 'DELETE', `/admin/pages/${p.id}`);
for (const s of await api(token, 'GET', '/admin/sections')) await api(token, 'DELETE', `/admin/sections/${s.key}`);
await api(token, 'PUT', '/admin/settings', { theme: before.theme, menu: before.menu });

await browser.close();
finish();
