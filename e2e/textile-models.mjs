// The sublimation designer's "On a model" view: the visitor's design bent onto a photo of a person wearing the product,
// and the admin's print-area editor where its four corners are marked.
import { createRequire } from 'node:module';
import { createBlock } from '../packages/blocks/dist/esm/index.js';
import { ADMIN, api, apiToken, BASE, check, finish, launch, shots, upload, watch } from './lib.mjs';

const sharp = createRequire(new URL('../apps/api/package.json', import.meta.url))('sharp');
const out = shots('textile-models');
const browser = await launch();
const token = await apiToken();

// A stand-in "model": a dark wall, skin, and a white T-shirt lit from the left with one deep diagonal fold.
const W = 1000;
const H = 1250;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="light" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d9d9"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="#2f4858"/>
  <circle cx="500" cy="190" r="120" fill="#c58c6a"/>
  <rect x="80" y="380" width="130" height="520" rx="60" fill="#c58c6a"/>
  <rect x="790" y="380" width="130" height="520" rx="60" fill="#c58c6a"/>
  <path d="M230 330 L400 290 Q500 340 600 290 L770 330 L800 1250 L200 1250 Z" fill="url(#light)"/>
  <path d="M330 520 L700 900" stroke="#6b6b6b" stroke-width="34" filter="url(#soft)" opacity="0.8"/>
</svg>`;
const photoBytes = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
const modelUrl = await upload(token, photoBytes, 'model.jpg', 'image/jpeg');
// The print area: a square on the chest, in fractions of the photo.
const area = [
  [0.3, 0.36],
  [0.7, 0.36],
  [0.7, 0.68],
  [0.3, 0.68],
];

const block = createBlock('textile-designer');
block.props.products[0].models = [{ image: modelUrl, area: area.flat().join(','), mask: '', label: 'Store' }];

const page0 = await api(token, 'POST', '/admin/pages', { name: 'On a model' });
await api(token, 'PATCH', `/admin/pages/${page0.id}`, {
  name: page0.name,
  translations: [
    { locale: 'en', slug: 'on-a-model', title: 'On a model', blocks: [block] },
    { locale: 'fa', slug: 'روی-مدل', title: 'روی مدل', blocks: [block] },
  ],
});
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/on-a-model`, { waitUntil: 'networkidle' });
check('the button shows for a product with model photos', await page.getByRole('button', { name: 'On a model' }).isVisible());
// A pink shirt with the default text on it.
await page.locator('button[aria-label="#fce7f3"]').click();
await page.getByRole('button', { name: 'Add text' }).first().click();
await page.getByRole('button', { name: 'On a model' }).click();
const viewer = page.locator('[role=dialog][aria-label="On a model"]');
await viewer.locator('canvas[data-on-model]').waitFor();
await page.waitForFunction(() => !document.querySelector('[role=dialog] .mdi-loading'));
await page.waitForTimeout(300);
await page.screenshot({ path: out + 'en-viewer.png' });

/** Average color of a small patch of the rendered photo (x, y as fractions). */
const patch = (x, y) =>
  page.evaluate(
    ([x, y]) => {
      const c = document.querySelector('canvas[data-on-model]');
      const d = c.getContext('2d').getImageData(Math.round(x * c.width) - 3, Math.round(y * c.height) - 3, 7, 7).data;
      const s = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k];
      return s.map((v) => v / (d.length / 4));
    },
    [x, y],
  );
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const size = await viewer.locator('canvas').evaluate((c) => [c.width, c.height]);
check('the photo keeps its shape', Math.abs(size[0] / size[1] - W / H) < 0.01, size.join('×'));
const wall = await patch(0.04, 0.04);
check('the wall around the model is untouched', Math.abs(wall[0] - 0x2f) < 6 && Math.abs(wall[2] - 0x58) < 6, wall.join(','));
const skin = await patch(0.145, 0.5);
check('the arms are untouched', Math.abs(skin[0] - 0xc5) < 8 && Math.abs(skin[1] - 0x8c) < 8, skin.join(','));
const plain = await patch(0.33, 0.4);
check('the print area takes the chosen color', plain[0] - plain[1] > 12, plain.join(','));
const hem = await patch(0.5, 0.95);
check('so does the rest of the shirt', hem[0] - hem[1] > 12, hem.join(','));
const fold = await patch(0.5, 0.556);
const flat = await patch(0.6, 0.45);
check('folds shade the print', lum(fold) < lum(flat) - 25, `${lum(fold)} vs ${lum(flat)}`);
const text = await page.evaluate(() => {
  // The default text is dark, in the middle of the print: some pixels there are much darker than the fabric.
  const c = document.querySelector('canvas[data-on-model]');
  const d = c.getContext('2d').getImageData(Math.round(c.width * 0.32), Math.round(c.height * 0.48), Math.round(c.width * 0.36), 40).data;
  let dark = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 200) dark++;
  return dark;
});
check('the design is on the shirt', text > 50, String(text));

const [download] = await Promise.all([page.waitForEvent('download'), viewer.getByRole('button', { name: 'Download' }).click()]);
check('Download saves a JPEG', download.suggestedFilename().endsWith('.jpg'));
await page.keyboard.press('Escape');
check('Esc closes the viewer', (await viewer.count()) === 0);
await page.getByRole('tab', { name: /Product/ }).click();
await page.getByRole('button', { name: 'Hoodie' }).click();
check('no button for a product without model photos', (await page.getByRole('button', { name: 'On a model' }).count()) === 0);

// Persian, on a phone.
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(mobile);
await mobile.goto(`${BASE}/fa/${encodeURIComponent('روی-مدل')}`, { waitUntil: 'networkidle' });
await mobile.getByRole('button', { name: 'روی مدل' }).click();
await mobile.locator('canvas[data-on-model]').waitFor();
await mobile.waitForFunction(() => !document.querySelector('[role=dialog] .mdi-loading'));
check(
  'fits a phone',
  await mobile.evaluate(() => document.querySelector('canvas[data-on-model]').getBoundingClientRect().width <= innerWidth),
);
await mobile.screenshot({ path: out + 'fa-mobile.png' });

// The admin marks the print area by dragging the corners.
const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(admin);
await admin.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await admin.fill('input[type=email]', ADMIN.email);
await admin.fill('input[type=password]', ADMIN.password);
await admin.click('button[type=submit]');
await admin.waitForURL(`${BASE}/admin`);
await admin.goto(`${BASE}/admin/pages/${page0.id}`, { waitUntil: 'networkidle' });
await admin.click('button:has-text("English")');
await admin.locator('main [id^=blk-] h2').first().click();
const corner = admin.locator('aside [data-corner="2"]');
await corner.waitFor();
await corner.scrollIntoViewIfNeeded();
const from = await corner.boundingBox();
await admin.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await admin.mouse.down();
await admin.mouse.move(from.x + 30, from.y + 40, { steps: 5 });
await admin.mouse.up();
await admin.screenshot({ path: out + 'admin-area.png' });
await admin.getByRole('button', { name: 'Save', exact: true }).click();
await admin.waitForTimeout(800);
const saved = await api(token, 'GET', `/admin/pages/${page0.id}`);
const savedArea = saved.translations
  .find((t) => t.locale === 'en')
  .blocks[0].props.products[0].models[0].area.split(',')
  .map(Number);
check('dragging a corner moves it', savedArea[4] > 0.7 && savedArea[5] > 0.68, savedArea.join(','));
check('the other corners stay', savedArea[0] === 0.3 && savedArea[1] === 0.36);

await api(token, 'DELETE', `/admin/pages/${page0.id}`);
await browser.close();
finish();
