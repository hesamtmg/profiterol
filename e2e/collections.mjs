import { ADMIN, BASE, check, finish, fixtures, launch, shots, watch } from './lib.mjs';

const out = shots('collections');
const browser = await launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);

// ---------- Public site ----------
await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
const projects = page.locator('#projects');
await projects.scrollIntoViewIfNeeded();
check('home shows 3 project cards', (await projects.locator('a[href^="/en/projects/"]').count()) === 3);
await projects.screenshot({ path: out + 'home-projects-en.png' });
await projects.getByRole('button', { name: 'Branding' }).click();
await page.waitForTimeout(700);
check('tag filter narrows to the 2 Branding projects', (await projects.locator('a[href^="/en/projects/"]').count()) === 2);

await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.screenshot({ path: out + 'collection-index-en.png', fullPage: true });
check('collection index lists 3 items', (await page.locator('main a[href^="/en/projects/"]').count()) === 3);

await page.click('main a[href="/en/projects/harbor-customs-portal"]');
await page.waitForURL('**/harbor-customs-portal');
await page.waitForLoadState('networkidle');
check('item page shows custom field "Client"', (await page.locator('dt', { hasText: 'Client' }).count()) === 1);
// Language switch keeps you on the same item
await page.click('header a[lang="fa"]');
await page.waitForURL(/\/fa\//, { timeout: 10000 }).catch(() => undefined);
await page.waitForLoadState('networkidle');
check('language switch opens the Persian item', decodeURI(page.url()).includes('/fa/پروژه‌ها/پورتال-گمرکی-بندر'));
check('Persian field label', (await page.locator('dt', { hasText: 'کارفرما' }).count()) === 1);

// ---------- Admin: edit an item ----------
await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await page.fill('input[type=email]', ADMIN.email);
await page.fill('input[type=password]', ADMIN.password);
await page.click('button[type=submit]');
await page.waitForURL(`${BASE}/admin`);
await page.click('nav >> text=Collections');
await page.waitForSelector('main a[href^="/admin/collections/"]');
await page.screenshot({ path: out + 'admin-collections.png' });

await page.click('main a:has-text("Projects")');
await page.waitForSelector('main a[href*="/items/"]');
await page.screenshot({ path: out + 'admin-collection-items.png' });

await page.click('main a[href*="/items/"]:has-text("Harbor customs portal")');
await page.waitForSelector('#title');
// Cover: upload through the media picker
await page.locator('aside button[title="Choose from media"]').click();
await page.setInputFiles('input[type=file]', fixtures.cover);
await page.waitForTimeout(1500);
// Gallery: add one image
await page.click('button:has-text("Add gallery")');
const galleryPicker = page.locator('section').first().locator('button[title="Choose from media"]').last();
await galleryPicker.click();
await page.setInputFiles('input[type=file]', fixtures.gallery);
await page.waitForTimeout(1500);
await page.locator('section').first().locator('label:has-text("Caption") + input').last().fill('Tracking dashboard');
await page.fill('#excerpt', 'A bilingual portal that cut customs clearance from days to hours. (edited)');
await page.screenshot({ path: out + 'admin-item-editor.png', fullPage: true });
await page.click('button:has-text("Save")');
await page.waitForSelector('text=All changes saved');
check('item saved', true);

// The editor opens on the Persian tab, so the edits above went into the Persian version.
await page.goto(`${BASE}/fa/${encodeURIComponent('پروژه‌ها')}/${encodeURIComponent('پورتال-گمرکی-بندر')}`, { waitUntil: 'networkidle' });
check('cover and gallery show on the item page', (await page.locator('article img[src^="/uploads/"]').count()) === 2);
check('edit is live', (await page.content()).includes('(edited)'));
await page.screenshot({ path: out + 'item-fa.png', fullPage: true });
await page.goto(`${BASE}/en/projects/harbor-customs-portal`, { waitUntil: 'networkidle' });
check('shared cover shows on the English page too', (await page.locator('article img[src^="/uploads/"]').count()) === 1);
await page.screenshot({ path: out + 'item-en.png', fullPage: true });

// ---------- Admin: new collection, item and block ----------
await page.goto(`${BASE}/admin/collections`, { waitUntil: 'networkidle' });
await page.click('button:has-text("New collection")');
await page.fill('#name-en', 'Team');
await page.fill('#name-fa', 'تیم');
await page.click('button:has-text("Create collection")');
await page.waitForSelector('text=Fields & settings');
await page.click('text=Fields & settings');
await page.click('button:has-text("Add field")');
await page.fill('#fl-0', 'Job title');
await page.fill('#ffa-0', 'سمت');
await page.click('button:has-text("Save collection")');
await page.waitForSelector('text=Collection saved');
check('collection field key generated', (await page.inputValue('#fk-0')) === 'jobTitle');
await page.screenshot({ path: out + 'admin-collection-fields.png', fullPage: true });

await page.click('button:has-text("Items (0)")');
await page.fill('input[aria-label="New item title"]', 'Sara Ahmadi');
await page.click('button:has-text("Add item")');
await page.waitForSelector('#title');
await page.locator('label:has-text("Job title") + input').fill('Designer');
await page.click('button:has-text("فارسی")');
await page.fill('#title', 'سارا احمدی');
await page.locator('label:has-text("Job title") + input').fill('طراح');
await page.click('button:has-text("Publish")');
await page.waitForSelector('text=Unpublish');
check('team item published', true);

// Add a Collection list block for Team to the home page in the editor
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.click('article >> text=Edit');
await page.waitForSelector('main [id^=blk-]');
await page.click('aside >> text=Collection list');
await page.waitForTimeout(600);
const select = page.locator('aside').last().locator('label:has-text("Collection") + select');
await select.selectOption('team');
await page.locator('aside').last().locator('label:has-text("Title") + input').first().fill('تیم ما');
await page.waitForTimeout(1200);
const canvasHasSara = (await page.locator('main').innerText()).includes('سارا احمدی');
check('editor canvas previews the Team collection', canvasHasSara);
await page.screenshot({ path: out + 'editor-collection-list.png' });
await page.click('button:has-text("Publish")');
await page.waitForSelector('text=Live', { timeout: 10000 });
await page.goto(`${BASE}/fa`, { waitUntil: 'networkidle' });
check('published home shows the Team list', (await page.content()).includes('سارا احمدی'));

// Mobile view of a Persian item
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/fa/${encodeURIComponent('پروژه‌ها')}/${encodeURIComponent('پورتال-گمرکی-بندر')}`, { waitUntil: 'networkidle' });
await mobile.screenshot({ path: out + 'item-fa-mobile.png', fullPage: true });

await browser.close();
finish();
