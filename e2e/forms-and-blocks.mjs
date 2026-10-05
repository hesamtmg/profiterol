import { readFileSync } from 'node:fs';
import { ADMIN, BASE, check, finish, fixtures, launch, shots, watch } from './lib.mjs';

const out = shots('forms-and-blocks');
const browser = await launch();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
watch(page, /youtube|status of 400/);

async function fileTransfer(path, name, type) {
  const b64 = readFileSync(path).toString('base64');
  return page.evaluateHandle(
    ([data, n, t]) => {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], n, { type: t }));
      return dt;
    },
    [b64, name, type],
  );
}

// ---------- Contact form on the public site ----------
await page.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200); // forms sent within two seconds are treated as bots
await page.click('button[type=submit]');
await page.waitForSelector('[role=alert]');
check('empty form shows what is missing', (await page.locator('[role=alert]').innerText()).includes('Name: is required'));
await page.screenshot({ path: out + 'form-errors-en.png' });

const form = page.locator('form');
await form.locator('input').nth(0).fill('Sara Ahmadi');
await form.locator('input[type=email]').fill('sara@example.com');
await form.locator('select').selectOption('Branding');
await form.locator('textarea').fill('We need a new logo and a bilingual site.');
await page.click('button[type=submit]');
await page.waitForSelector('[role=status]');
check('valid message shows the thank-you note', (await page.locator('[role=status]').innerText()).includes('Thank you'));
await page.screenshot({ path: out + 'form-sent-en.png' });

await page.goto(`${BASE}/fa/contact`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.click('button[type=submit]');
await page.waitForSelector('[role=alert]');
check('Persian errors', (await page.locator('[role=alert]').innerText()).includes('نام: را پر کنید'));
await page.locator('form input').nth(0).fill('علی');
await page.locator('form input[type=email]').fill('ali@example.com');
await page.locator('form select').selectOption('وب‌سایت');
await page.locator('form textarea').fill('سلام، یک سایت دو زبانه می‌خواهم.');
await page.click('button[type=submit]');
await page.waitForSelector('[role=status]');
check('Persian message sent', true);
await page.screenshot({ path: out + 'form-fa.png', fullPage: true });

// ---------- Inbox ----------
await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await page.fill('input[type=email]', ADMIN.email);
await page.fill('input[type=password]', ADMIN.password);
await page.click('button[type=submit]');
await page.waitForURL(`${BASE}/admin`);
await page.waitForTimeout(500);
check('nav badge shows 2 unread', (await page.locator('nav a[href="/admin/inbox"] span[aria-label="2 unread"]').count()) === 1);
await page.click('nav a[href="/admin/inbox"]');
await page.waitForSelector('text=Sara Ahmadi');
await page.click('button:has-text("Sara Ahmadi")');
await page.waitForSelector('dd:has-text("We need a new logo")');
check('message details', (await page.locator('a[href="mailto:sara@example.com"]').count()) === 1);
check('opening marks it read', (await page.locator('nav a[href="/admin/inbox"] span[aria-label="1 unread"]').count()) === 1);
await page.screenshot({ path: out + 'inbox.png' });
const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export CSV")')]);
const csv = readFileSync(await download.path(), 'utf8');
check('CSV export has both messages', csv.includes('Sara Ahmadi') && csv.includes('علی') && csv.startsWith('﻿'));

// Notification address
await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
await page.fill('#notify', 'owner@example.com');
await page.click('button:has-text("Save settings")');
await page.waitForSelector('text=Settings saved');
check('notification email saved', true);

// ---------- New blocks in the editor ----------
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.fill('input[placeholder^="New page name"]', 'Showcase');
await page.click('button:has-text("New page")');
await page.waitForURL(/\/admin\/pages\//);
await page.waitForSelector('text=Drag a block here');
await page.click('button:has-text("English")');
const panel = () => page.locator('aside').last();
for (const label of ['Video hero', 'Carousel', 'Gallery', 'Video player', 'Contact form']) {
  await page.locator('aside').first().locator(`button:has-text("${label}")`).click();
  await page.waitForTimeout(250);
}
const blocks = page.locator('main [id^=blk-]');
check('five new blocks added', (await blocks.count()) === 5);

// Carousel: image on the first slide via the panel field
await blocks.nth(1).click({ position: { x: 300, y: 60 } });
const slideImage = panel().locator('input[placeholder="Drop an image"]').first();
await slideImage.dispatchEvent('drop', { dataTransfer: await fileTransfer(fixtures.cover, 'slide.png', 'image/png') });
await page.waitForFunction(() => [...document.querySelectorAll('aside input')].some((i) => i.value.startsWith('/uploads/')), null, {
  timeout: 10000,
});

// Gallery: three photos
await blocks.nth(2).click({ position: { x: 300, y: 40 } });
for (const file of ['cover-harbor.png', 'gallery-1.png', 'cover-harbor.png']) {
  await panel().locator('button:has-text("Add photo")').click();
  const field = panel().locator('input[placeholder="Drop an image"]').last();
  await field.dispatchEvent('drop', {
    dataTransfer: await fileTransfer(file === 'gallery-1.png' ? fixtures.gallery : fixtures.cover, file, 'image/png'),
  });
  await page.waitForFunction(
    () => {
      const inputs = [...document.querySelectorAll('aside input[placeholder="Drop an image"]')];
      return inputs.length && inputs[inputs.length - 1].value.startsWith('/uploads/');
    },
    null,
    { timeout: 10000 },
  );
}
check('gallery shows 3 photos in the canvas', (await blocks.nth(2).locator('img').count()) === 3);

// Video player: a YouTube link
await blocks.nth(3).click({ position: { x: 300, y: 40 } });
await panel().locator('label:has-text("YouTube") + input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await page.waitForTimeout(300);
check(
  'YouTube link becomes a privacy-friendly embed',
  (await blocks.nth(3).locator('iframe').getAttribute('src')) === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
);
await page.locator('main').click({ position: { x: 5, y: 5 } });
await page.screenshot({ path: out + 'editor-new-blocks.png', fullPage: false });

await page.click('button:has-text("Publish")');
await page.waitForSelector('header >> text=Live', { timeout: 15000 });
const slug = await page.evaluate(() => document.querySelector('#page-slug')?.value);

// ---------- Public showcase page ----------
const pub = await ctx.newPage();
await pub.goto(`${BASE}/en/${slug}`, { waitUntil: 'networkidle' });
await pub.screenshot({ path: out + 'showcase-en.png', fullPage: true });
const dots = pub.locator('[aria-label^="Go to slide"]');
check('carousel starts on slide 1', (await dots.nth(0).getAttribute('aria-current')) === 'true');
await pub.click('button[aria-label="Next slide"]');
await pub.waitForTimeout(900);
check('next arrow moves to slide 2', (await dots.nth(1).getAttribute('aria-current')) === 'true');
await pub.locator('button[aria-label^="Photo"]').first().click();
await pub.waitForSelector('[role=dialog][aria-modal=true]');
check('gallery opens full screen', (await pub.locator('[role=dialog] >> text=1 / 3').count()) === 1);
await pub.keyboard.press('ArrowRight');
check('arrow key moves to the next photo', (await pub.locator('[role=dialog] >> text=2 / 3').count()) === 1);
await pub.screenshot({ path: out + 'lightbox.png' });
await pub.keyboard.press('Escape');
await pub.waitForTimeout(400);
check('Escape closes it', (await pub.locator('[role=dialog][aria-modal=true]').count()) === 0);
check('second contact form on the page has its own id', (await pub.locator('form').count()) === 1);

await browser.close();
finish();
