import { readFileSync } from 'node:fs';
import { ADMIN, BASE, check, finish, fixtures, launch, shots, watch } from './lib.mjs';

const out = shots('editor');
const browser = await launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
const blocks = () => page.locator('main [id^=blk-]');
const panel = () => page.locator('aside').last();

async function apiDraft(locale) {
  return page.evaluate(async (loc) => {
    // The admin's session cookie goes along by itself; reading needs no CSRF header.
    const pages = await (await fetch('/api/admin/pages')).json();
    return pages.find((p) => p.isHome).translations.find((t) => t.locale === loc).blocks;
  }, locale);
}

await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await page.fill('input[type=email]', ADMIN.email);
await page.fill('input[type=password]', ADMIN.password);
await page.click('button[type=submit]');
await page.waitForURL(`${BASE}/admin`);
await page.click('article >> text=Edit');
await page.waitForSelector('main [id^=blk-] .editable');

// ---------- Inline editing (English) ----------
await page.click('button:has-text("English")');
await page.waitForTimeout(300);
const gridTitle = blocks().nth(1).locator('h2 .editable');
await gridTitle.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('Built in place');
check('canvas shows typed text', (await gridTitle.innerText()) === 'Built in place');
check('right panel follows the canvas', (await panel().locator('label:has-text("Title") + input').first().inputValue()) === 'Built in place');
await page.keyboard.press('Enter');
check('Enter finishes a single-line field', await page.evaluate(() => !document.activeElement?.classList.contains('editable')));

// A card inside the grid
const cardText = blocks().nth(1).locator('.editable').nth(3);
await cardText.click();
await page.keyboard.press('End');
await page.keyboard.type(' Edited on the card.');
await page.locator('main').click({ position: { x: 5, y: 5 } });
await page.screenshot({ path: out + 'inline-edit.png' });

// Multiline: FAQ answer
const faq = blocks().filter({ has: page.locator('.faq-toggle') }).first();
await faq.scrollIntoViewIfNeeded();
const answer = faq.locator('li').first().locator('.editable').nth(1);
await answer.click();
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('A second line.');
await page.keyboard.press('Escape');
check('multiline answer keeps its line break', (await answer.innerText()).includes('\nA second line.'));

// Undo the FAQ edit, then redo it
await page.waitForTimeout(600);
await page.click('button[title^="Undo"]');
await page.waitForTimeout(300);
check('undo reverts an inline edit', !(await answer.innerText()).includes('A second line.'));
await page.click('button[title^="Redo"]');
await page.waitForTimeout(300);
check('redo brings it back', (await answer.innerText()).includes('A second line.'));

// ---------- Autosave ----------
await page.waitForSelector('text=/Saved \\d/', { timeout: 10000 });
const draftEn = await apiDraft('en');
check('autosave stored the inline edit', JSON.stringify(draftEn).includes('Built in place') && JSON.stringify(draftEn).includes('Edited on the card.'));

// ---------- Show on: phones only ----------
const statement = blocks().filter({ hasText: 'Speed is our key power' }).first();
await statement.click({ position: { x: 40, y: 150 } });
await panel().locator('label:has-text("Show on") + select').selectOption('mobile');
await page.waitForTimeout(300);
check('badge shows "Phones only"', (await statement.locator('text=Phones only').count()) === 1);
check('dimmed in desktop preview', (await statement.locator('.opacity-30').count()) === 1);
await page.click('button[title=mobile]');
await page.waitForTimeout(500);
check('not dimmed in phone preview', (await statement.locator('.opacity-30').count()) === 0);
await page.screenshot({ path: out + 'show-on-mobile-preview.png' });
await page.click('button[title=desktop]');

// ---------- Drop an image file onto a block ----------
const b64 = readFileSync(fixtures.cover).toString('base64');
const dt = await page.evaluateHandle((data) => {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], 'drop.png', { type: 'image/png' }));
  return transfer;
}, b64);
await statement.dispatchEvent('dragover', { dataTransfer: dt });
await page.waitForTimeout(100);
check('drop overlay appears', (await page.locator('text=Drop to use as background image').count()) === 1);
await page.screenshot({ path: out + 'drop-overlay.png' });
await statement.dispatchEvent('drop', { dataTransfer: dt });
await page.waitForFunction(() => document.querySelector('aside:last-of-type input[placeholder="Drop an image"]')?.value.startsWith('/uploads/'), null, { timeout: 10000 });
check('dropped photo becomes the background image', true);
await page.waitForTimeout(800);
await page.screenshot({ path: out + 'after-drop.png' });

// Drop onto the image field in the panel (second file replaces the first)
const b64b = readFileSync(fixtures.gallery).toString('base64');
const dt2 = await page.evaluateHandle((data) => {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], 'field.png', { type: 'image/png' }));
  return transfer;
}, b64b);
const imageInput = panel().locator('input[placeholder="Drop an image"]');
const before = await imageInput.inputValue();
await imageInput.dispatchEvent('drop', { dataTransfer: dt2 });
await page.waitForFunction((prev) => {
  const v = document.querySelector('aside:last-of-type input[placeholder="Drop an image"]')?.value;
  return v && v !== prev && v.startsWith('/uploads/');
}, before, { timeout: 10000 });
check('dropping on the image field uploads and sets it', true);

// ---------- Persian inline edit ----------
await page.click('button:has-text("فارسی")');
await page.waitForTimeout(300);
const heroTitle = blocks().first().locator('h1 .editable').first();
await heroTitle.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('استودیو طراحی تازه');
await page.keyboard.press('Enter');
check('Persian text edited in place', (await heroTitle.innerText()) === 'استودیو طراحی تازه');
await page.screenshot({ path: out + 'inline-edit-fa.png' });

// ---------- Publish and check the live site ----------
await page.click('button:has-text("Publish")');
await page.waitForSelector('header >> text=Live', { timeout: 15000 });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
const live = await desktop.content();
check('inline edits are live', live.includes('Built in place') && live.includes('Edited on the card.') && live.includes('A second line.'));
check('phones-only block hidden on desktop', !(await desktop.locator('text=Speed is our key power').isVisible()));
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
check('phones-only block shown on a phone', await phone.locator('text=Speed is our key power').isVisible());
await phone.locator('text=Speed is our key power').scrollIntoViewIfNeeded();
await phone.screenshot({ path: out + 'phone-statement.png' });
await desktop.goto(`${BASE}/fa`, { waitUntil: 'networkidle' });
check('Persian edit is live', (await desktop.content()).includes('استودیو طراحی تازه'));
check('public site has no editable text', (await desktop.locator('.editable').count()) === 0);

await browser.close();
finish();
