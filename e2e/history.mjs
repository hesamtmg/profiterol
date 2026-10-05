// Version history (restore and undo a restore), scheduled publishing, and duplicating pages.
import { api, apiToken, BASE, adminLogin, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('history');
// Pages left by an earlier run of this suite.
const token = await apiToken();
for (const p of await api(token, 'GET', '/admin/pages'))
  if (p.name.startsWith('History demo')) await api(token, 'DELETE', `/admin/pages/${p.id}`);

const browser = await launch();
// 400: the deliberately wrong schedule below.
const page = watch(await browser.newPage({ viewport: { width: 1440, height: 900 } }), /status of 400/);
page.on('dialog', (d) => d.accept());
await adminLogin(page);

// A new page with one block, published, then edited.
await page.fill('input[placeholder^="New page name"]', 'History demo');
await page.click('button:has-text("New page")');
await page.waitForURL(/\/admin\/pages\//);
await page.click('button:has-text("English")');
await page
  .locator('aside')
  .first()
  .locator('button')
  .filter({ hasText: /^\s*Text\s*$/ })
  .first()
  .click();
await page.waitForSelector('main [id^=blk-]');
await page
  .locator('main [id^=blk-]')
  .first()
  .click({ position: { x: 20, y: 20 } });
const titleInput = page.locator('aside').last().locator('label:has-text("Title") + input').first();
await titleInput.fill('First version');
await page.click('header button:has-text("Save")');
await page.waitForSelector('header >> text=/Saved|not live/');
await page.click('header button:has-text("Publish")');
await page.waitForSelector('header >> text=Live');
await titleInput.fill('Second version');
await page.click('header button:has-text("Save")');
await page.waitForTimeout(800);

await page.click('header button[title="Version history"]');
await page.waitForSelector('[role=dialog] [data-revision]');
const kinds = await page.locator('[role=dialog] [data-revision] p.font-semibold').allInnerTexts();
check(
  'history lists the edit and the publish',
  kinds[0].startsWith('Edited') && kinds.some((k) => k.startsWith('Published')),
  kinds.join(' | '),
);
await page.screenshot({ path: out + 'history.png' });

// Restore the published version: the canvas shows it again.
const published = page.locator('[role=dialog] [data-revision]', { hasText: 'Published' }).first();
await published.hover();
await published.locator('button:has-text("Restore")').click();
await page.waitForSelector('text=/Restored the version from/');
check('restoring brings the published text back', (await page.locator('main [id^=blk-]').first().innerText()).includes('First version'));

// The restore itself can be undone: the edited version is still in the history.
await page.click('header button[title="Version history"]');
await page.waitForSelector('[role=dialog] [data-revision]');
const after = await page.locator('[role=dialog] [data-revision] p.font-semibold').allInnerTexts();
check('the restore is in the history', after[0].startsWith('Restored'), after.join(' | '));
// Right below the restore: the draft it replaced.
const edited = page.locator('[role=dialog] [data-revision]').nth(1);
check('the replaced draft is kept', after[1].startsWith('Edited'), after.join(' | '));
await edited.hover();
await edited.locator('button:has-text("Restore")').click();
const undone = await page
  .waitForFunction(() => document.querySelector('main [id^=blk-]')?.textContent?.includes('Second version'), null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
check('undoing the restore', undone);

// Schedule: go live tomorrow at 09:00, shown here and in the page list.
await page.keyboard.press('Escape');
const d = new Date(Date.now() + 86_400_000);
const pad = (n) => String(n).padStart(2, '0');
const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
await page.fill('#publish-at', local);
await page.locator('#publish-at').dispatchEvent('change');
await page.waitForSelector('[data-schedule] >> text=/will be published on/');
check('schedule is saved and explained', true);
await page.locator('[data-schedule]').screenshot({ path: out + 'schedule.png' });
await page.fill('#unpublish-at', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`);
await page.locator('#unpublish-at').dispatchEvent('change');
await page.waitForSelector('[data-schedule] >> text=/must go offline after/');
check('offline before online is refused', true);

await page.click('a[title="Back to pages"]');
await page.waitForURL(`${BASE}/admin`);
const card = page.locator('article').filter({ has: page.getByText('History demo', { exact: true }) });
check(
  'page list shows when it goes live',
  await card
    .locator('text=/Goes live/')
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    ),
);

// Duplicate
await card.locator('button[title="Duplicate"]').click();
await page.waitForSelector('article >> text="History demo (copy)"');
const copy = page.locator('article').filter({ has: page.getByText('History demo (copy)', { exact: true }) });
check(
  'the copy is a draft with its own address',
  (await copy.locator('text=Draft').count()) === 1 && (await copy.locator('text=/history-demo-copy/').count()) >= 1,
);
check('the copy has no schedule', (await copy.locator('text=/Goes live/').count()) === 0);
await page.screenshot({ path: out + 'pages-with-copy.png' });

await browser.close();
finish();
