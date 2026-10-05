// The media library: search, kinds, folders, descriptions per language, and where each file is used.
import { api, apiToken, BASE, adminLogin, check, finish, fixtures, launch, photo, shots, upload, watch } from './lib.mjs';

const out = shots('media');
const browser = await launch();
const token = await apiToken();
const name = `lighthouse-${Date.now()}.jpg`;
const url = await upload(
  token,
  await photo({ width: 1400, height: 900, from: '#1d3557', to: '#e9c46a', label: 'Lighthouse' }),
  name,
  'image/jpeg',
);

const page = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }));
page.on('dialog', (d) => d.accept());
await adminLogin(page);
await page.goto(`${BASE}/admin/media`, { waitUntil: 'networkidle' });

const card = page.locator(`[data-media="${name}"]`);
await card.waitFor();
check('a new file shows as not used', (await card.locator('text=Not used').count()) === 1);

// Details: description in both languages and a folder.
await card.click();
await page.waitForSelector('[role=dialog][aria-label="File details"]');
await page.fill('#alt-en', 'A lighthouse at sunset');
await page.fill('#alt-fa', 'فانوس دریایی در غروب');
await page.fill('#media-folder', 'Coast');
await page.click('[role=dialog] button:has-text("Save")');
await page.waitForSelector('[role=dialog] [role=status]:has-text("Saved")');
await page.screenshot({ path: out + 'details.png' });
await page.click('[role=dialog] button[title="Close"]');

// Search by description, filter by kind and folder.
await page.fill('input[type=search]', 'lighthouse at sunset');
await page.waitForTimeout(700);
check('search finds it by its description', (await page.locator('[data-media]').count()) >= 1 && (await card.count()) === 1);
await page.fill('input[type=search]', '');
await page.click('[role=radio]:has-text("Videos")');
await page.waitForTimeout(500);
check('the Videos filter leaves it out', (await card.count()) === 0);
await page.click('[role=radio]:has-text("All")');
await page.selectOption('select[aria-label="Folder"]', 'Coast');
await page.waitForTimeout(500);
check('the folder shows only its files', (await page.locator('[data-media]').count()) === 1 && (await card.count()) === 1);

// Uploading while a folder is chosen puts the file in it.
await page.setInputFiles('input[type=file]', fixtures.gallery);
await page.waitForSelector('[data-media="gallery-1.png"]');
check('a file uploaded in a folder goes into it', (await page.locator('[data-media]').count()) === 2);

// Used on a page: the library says where, and links there.
const p = await api(token, 'POST', '/admin/pages', { name: 'Coast page' });
await api(token, 'PATCH', `/admin/pages/${p.id}`, {
  translations: [
    {
      locale: 'en',
      title: 'Coast',
      slug: `coast-${Date.now()}`,
      blocks: [{ id: 'g', type: 'gallery', props: { images: [{ image: url, caption: '' }] } }],
    },
  ],
});
await page.reload({ waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Folder"]', 'Coast');
await card.waitFor();
check('it now shows as used once', (await card.locator('text=/Used in 1/').count()) === 1);
await card.click();
const link = page.locator('[role=dialog] a:has-text("Coast page")');
check('the details link to the page', (await link.getAttribute('href')) === `/admin/pages/${p.id}`);
await page.locator('[role=dialog] button[title="Close"]').click();

// Deleting a used file warns first (the dialog is accepted, so it goes).
let warned = '';
page.removeAllListeners('dialog');
page.on('dialog', (d) => ((warned = d.message()), d.accept()));
await card.locator('button[title="Delete"]').click();
await page.waitForTimeout(500);
check('deleting a used file names where it is used', warned.includes('Coast page'), warned);

// The Persian admin: the screen and the description fields in Persian.
await page.click('[role=radio][lang=fa]');
await page.waitForTimeout(300);
check('the library in Persian', (await page.locator('h1:has-text("رسانه")').count()) === 1);
await page.screenshot({ path: out + 'library-fa.png' });
await page.click('[role=radio][lang=en]');

await api(token, 'DELETE', `/admin/pages/${p.id}`);
for (const m of await api(token, 'GET', '/admin/media?folder=Coast')) await api(token, 'DELETE', `/admin/media/${m.id}`);
await browser.close();
finish();
