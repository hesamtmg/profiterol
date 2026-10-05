import { ADMIN, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('classic');
const browser = await launch();

const dialogs = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, /429/);
page.on('dialog', (d) => (dialogs.push(d.message()), d.dismiss()));
await page.goto(`${BASE}/en/classic`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
check('kind 1 video plays muted', await page.locator('#k1 video').first().evaluate((v) => v.muted && !v.paused));

const ids = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12'];
for (const id of ids) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  await el.screenshot({ path: `${out}en-${id}.png` });
}
check('all 12 kinds render', (await page.locator('section').count()) >= 12);
check('kind 9 sanitized: no script, no onerror, no javascript: link', (await page.locator('#k9 script, #k9 img, #k9 a[href^="javascript"]').count()) === 0 && dialogs.length === 0);
check('kind 9 formatting kept', (await page.locator('#k9 ol li').count()) === 4 && (await page.locator('#k9 blockquote').count()) === 1);

// kind 2: hover reveals text
await page.locator('#k2').scrollIntoViewIfNeeded();
await page.locator('#k2 a').first().hover();
await page.waitForTimeout(900);
check('kind 2 hover shows the description', (await page.locator('#k2 a p').first().evaluate((e) => getComputedStyle(e).opacity)) === '1');
await page.locator('#k2').screenshot({ path: `${out}en-k2-hover.png` });

// kind 4: paragraphs open on hover
const para = page.locator('#k4 p[tabindex]').first();
await para.scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
const closedH = (await para.boundingBox()).height;
await para.hover();
await page.waitForTimeout(900);
check('kind 4 paragraph opens on hover', (await para.boundingBox()).height > closedH);

// kind 10: custom player
await page.locator('#k10').scrollIntoViewIfNeeded();
await page.locator('#k10 button[aria-label="Play"]').first().click();
await page.waitForTimeout(1500);
check('kind 10 plays with the custom button', await page.locator('#k10 video').nth(1).evaluate((v) => !v.paused));
await page.locator('#k10 button[aria-label="Playback speed"]').click();
await page.locator('#k10 [role=menuitemradio]', { hasText: '1.5x' }).click();
check('kind 10 speed menu sets 1.5x', (await page.locator('#k10 video').nth(1).evaluate((v) => v.playbackRate)) === 1.5);
await page.locator('#k10 button[aria-label="Forward 5 seconds"]').click();
check('kind 10 skips forward', (await page.locator('#k10 video').nth(1).evaluate((v) => v.currentTime)) > 5);
await page.locator('#k10 [role=region]').hover();
await page.locator('#k10').screenshot({ path: `${out}en-k10-playing.png` });
await page.locator('#k10 button[aria-label="Pause"]').first().click();

// kind 11: slider arrows
await page.locator('#k11').scrollIntoViewIfNeeded();
const cap = () => page.locator('#k11 p.glass').innerText();
const first = await cap();
await page.locator('#k11 button[aria-label="Next slide"]').click();
await page.waitForTimeout(1200);
check('kind 11 next arrow changes slide', (await cap()) !== first);
await page.locator('#k11').screenshot({ path: `${out}en-k11-next.png` });

// kind 12: a photo without a link opens the larger view
await page.locator('#k12').scrollIntoViewIfNeeded();
await page.locator('#k12 button[aria-label="Project 2"]').first().click();
await page.waitForTimeout(500);
check('kind 12 opens the larger view', (await page.locator('[role=dialog]').count()) === 1);
await page.screenshot({ path: `${out}en-k12-modal.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('kind 12 closes with Escape', (await page.locator('[role=dialog]').count()) === 0);

// kind 7: the form delivers to the inbox
await page.locator('#k7').scrollIntoViewIfNeeded();
await page.waitForTimeout(3000); // the API ignores forms filled in under a few seconds
await page.locator('#k7 input').nth(0).fill('Test person');
await page.locator('#k7 input[type=email]').fill('test@example.com');
await page.locator('#k7 textarea').fill('Hello from the classic contact block.');
await page.locator('#k7 button[type=submit]').click();
await page.waitForSelector('#k7 [role=status]', { timeout: 10000 }).catch(() => null);
check('kind 7 sends the message', (await page.locator('#k7 [role=status]').count()) === 1);
await page.locator('#k7').screenshot({ path: `${out}en-k7-sent.png` });

// Persian on a phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone, /429/);
await phone.goto(`${BASE}/fa/classic`, { waitUntil: 'networkidle' });
for (const id of ['k2', 'k4', 'k5', 'k7', 'k11', 'k12']) {
  const el = phone.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await phone.waitForTimeout(1200);
  await el.screenshot({ path: `${out}fa-mobile-${id}.png` });
}
check('no sideways scrolling on phones', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('kind 12 uses the phone grid (2 columns)', (await phone.locator('#k12 .grid:visible').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length)) === 2);

// Editor: the Classic category and the rich-text toolbar
const ed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ed, /429/);
await ed.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ed.fill('input[type=email]', ADMIN.email);
await ed.fill('input[type=password]', ADMIN.password);
await ed.click('button[type=submit]');
await ed.waitForURL(`${BASE}/admin`);
await ed.locator('article', { hasText: 'Classic' }).getByText('Edit').click();
await ed.waitForSelector('main [id^=blk-]');
check('editor lists the 12 classic sections', (await ed.locator('aside h3', { hasText: 'Classic sections' }).locator('xpath=following-sibling::div[1]/button').count()) === 12);
await ed.locator('aside h3', { hasText: 'Classic sections' }).scrollIntoViewIfNeeded();
await ed.screenshot({ path: `${out}editor-library.png` });

// Select the rich-text block and use the toolbar
await ed.locator('main [id^=blk-k9]').click({ position: { x: 40, y: 20 } });
await ed.waitForTimeout(300);
const rt = ed.locator('aside [role=toolbar] + [contenteditable]');
check('rich-text field shows the formatting editor', (await rt.count()) === 1);
await rt.click();
await ed.keyboard.press('Control+End');
await ed.keyboard.press('Enter');
await ed.keyboard.type('Added from the toolbar');
await ed.locator('aside [role=toolbar] button[title="Heading"]').click();
await ed.waitForTimeout(400);
check('toolbar heading shows on the canvas', (await ed.locator('main [id^=blk-k9] h2', { hasText: 'Added from the toolbar' }).count()) === 1);
await ed.screenshot({ path: `${out}editor-richtext.png` });

// Insert a new classic block by clicking it
const before = await ed.locator('main [id^=blk-]').count();
await ed.locator('aside button', { hasText: '12 · Chessboard grid' }).click();
await ed.waitForTimeout(500);
check('clicking a classic section inserts it', (await ed.locator('main [id^=blk-]').count()) === before + 1);
await ed.click('header button:has-text("Save")');
await ed.waitForTimeout(1500);
check('page saves with the new blocks', (await ed.locator('header', { hasText: 'Saved' }).count()) + (await ed.locator('header', { hasText: 'Unpublished' }).count()) > 0 || (await ed.locator('header >> text=Unsaved').count()) === 0);

// Phone preview in the editor uses the phone photos/grid
await ed.click('button[title=mobile]');
await ed.waitForTimeout(800);
await ed.locator('main [id^=blk-k11]').scrollIntoViewIfNeeded();
await ed.screenshot({ path: `${out}editor-mobile.png` });

await browser.close();
finish();
