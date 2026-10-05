// Columns and groups (blocks inside blocks), and the style options every block has.
import { api, apiToken, BASE, adminLogin, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('layout');
const browser = await launch();
const token = await apiToken();
for (const p of await api(token, 'GET', '/admin/pages')) if (p.name === 'Layout demo') await api(token, 'DELETE', `/admin/pages/${p.id}`);

const page = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }));
await adminLogin(page);
await page.fill('input[placeholder^="New page name"]', 'Layout demo');
await page.click('button:has-text("New page")');
await page.waitForURL(/\/admin\/pages\//);
await page.click('button:has-text("English")');
const library = page.locator('aside').first();
const panel = page.locator('aside').last();
// The Columns block itself: through its toolbar (clicks inside a column select the block there).
const selectColumns = async () => {
  await page
    .locator('main [data-type=columns]')
    .first()
    .hover({ position: { x: 300, y: 300 } });
  await page.locator('main [data-type=columns] .drag-handle').first().click();
};
const pick = (label) =>
  library
    .locator('button')
    .filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) })
    .first();

// Columns, then a block into each column with the column's "Add a block" button.
await pick('Columns').click();
await page.waitForSelector('main [data-column]');
check('a Columns block starts with two empty columns', (await page.locator('main [data-column]').count()) === 2);
const columns = page.locator('main [data-column]');
await columns.nth(0).locator('button:has-text("Add a block to this column")').click();
check('the column waits for a block', (await columns.nth(0).locator('text=Now pick a block on the left').count()) === 1);
await pick('Text').click();
await columns.nth(1).locator('button:has-text("Add a block to this column")').click();
await pick('FAQ').click();
await page.waitForTimeout(300);
check(
  'one block in each column',
  (await columns.nth(0).locator('[id^=blk-]').count()) === 1 && (await columns.nth(1).locator('[id^=blk-]').count()) === 1,
);
check('the new block is selected', (await panel.locator('h2:has-text("FAQ")').count()) === 1);

// Full-screen blocks do not go into columns: picked while a nested block is selected, they go after the columns.
await pick('Spotlight hero').click();
await page.waitForTimeout(300);
const top = await page.evaluate(() => [...document.querySelectorAll('main .site > div > [id^=blk-]')].map((e) => e.dataset.type));
check(
  'a full-screen block lands on the page, after the columns',
  JSON.stringify(top) === JSON.stringify(['columns', 'spotlight']),
  JSON.stringify(top),
);
await page.keyboard.press('Escape');
await page
  .locator('main [data-type=spotlight]')
  .first()
  .click({ position: { x: 40, y: 40 } });
await page.keyboard.press('Delete');

// Three columns: the third appears; back to two keeps its blocks.
await selectColumns();
await panel.getByLabel('Columns', { exact: true }).selectOption('3');
await page.waitForTimeout(300);
check('three columns', (await columns.count()) === 3);
await columns.nth(2).locator('button:has-text("Add a block to this column")').click();
await pick('Counters').click();
await selectColumns();
await panel.getByLabel('Columns', { exact: true }).selectOption('2');
await page.waitForTimeout(300);
check(
  'back to two: the third column’s block moved into the second',
  (await columns.count()) === 2 && (await columns.nth(1).locator('[id^=blk-]').count()) === 2,
);

// Style: a background color for the whole columns block.
await panel.locator('summary:has-text("Style")').click();
await panel.getByLabel('Backdrop color', { exact: true }).fill('#1d3557');
await page.waitForTimeout(300);
await page.screenshot({ path: out + 'editor.png' });

// Layers show the nesting.
await library.getByRole('button', { name: /^Layers \(/ }).click();
await library
  .getByText('Column 2', { exact: true })
  .waitFor({ timeout: 5000 })
  .catch(() => undefined);
check(
  'layers list the blocks inside the columns',
  (await library.getByText('Column 1', { exact: true }).count()) === 1 &&
    (await library.getByText('Column 2', { exact: true }).count()) === 1,
);
await library.getByRole('button', { name: 'Add blocks' }).click();

await page.click('header button:has-text("Publish")');
await page.waitForSelector('header >> text=Live', { timeout: 15000 });

// The site: columns side by side on a wide screen, stacked on a phone, with the background color.
await page.keyboard.press('Escape');
const slug = await page.inputValue('#page-slug');
const site = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }));
await site.goto(`${BASE}/en/${slug}`, { waitUntil: 'networkidle' });
const cells = site.locator('.grid > .min-w-0');
const [a, b] = [await cells.nth(0).boundingBox(), await cells.nth(1).boundingBox()];
check('desktop: two columns side by side', Math.abs(a.y - b.y) < 2 && b.x > a.x + 200, JSON.stringify([a, b]));
const bgColor = await site.evaluate(() => getComputedStyle(document.querySelector('[style*="--c-background"]')).backgroundColor);
check('the background color is applied', bgColor === 'rgb(29, 53, 87)', bgColor);
check(
  'the blocks inside render on the site',
  (await site.locator('text=Frequently asked').count()) + (await site.locator('dt, summary, details').count()) > 0,
);
await site.screenshot({ path: out + 'site-desktop.png', fullPage: true });
const phone = watch(await browser.newPage({ viewport: { width: 390, height: 844 } }));
await phone.goto(`${BASE}/en/${slug}`, { waitUntil: 'networkidle' });
const [pa, pb] = [
  await phone.locator('.grid > .min-w-0').nth(0).boundingBox(),
  await phone.locator('.grid > .min-w-0').nth(1).boundingBox(),
];
check('phone: the columns stack', pb.y > pa.y + pa.height - 2, JSON.stringify([pa, pb]));
await phone.screenshot({ path: out + 'site-phone.png', fullPage: true });

await browser.close();
finish();
