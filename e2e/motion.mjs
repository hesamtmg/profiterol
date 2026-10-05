import { ADMIN, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('motion');
const browser = await launch();

const top = (p, id) => p.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY), id);

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/motion`, { waitUntil: 'networkidle' });

// Aurora hero
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'm1-aurora.png' });
const w1 = await page.locator('#m1 .text-shimmer').innerText();
await page.waitForTimeout(3000);
check('aurora: the changing word changes', (await page.locator('#m1 .text-shimmer').innerText()) !== w1);
await page.mouse.move(300, 300);
await page.waitForTimeout(200);
check('aurora: light follows the mouse', (await page.locator('#m1 section').evaluate((s) => s.style.getPropertyValue('--mx'))) !== '');

// Entrance animation: hidden before it is scrolled to, then played and cleaned up
const zoomWrap = page.locator('#m6 > div');
check(
  'entrance: block waits hidden below the fold',
  await zoomWrap.evaluate((e) => e.classList.contains('anim-zoom') && getComputedStyle(e).opacity === '0'),
);

// Scroll-lit text
const opac = () => page.locator('#m3 p span').evaluateAll((s) => s.map((x) => Number(x.style.opacity)));
await page.evaluate(() =>
  window.scrollTo(0, document.getElementById('m3').getBoundingClientRect().top + scrollY - window.innerHeight * 0.75),
);
await page.waitForTimeout(400);
const early = await opac();
await page.evaluate(() => window.scrollTo(0, document.getElementById('m3').getBoundingClientRect().top + scrollY - 100));
await page.waitForTimeout(400);
const later = await opac();
const sum = (a) => a.reduce((x, y) => x + y, 0);
check('scroll-lit: more words lit after scrolling', sum(later) > sum(early) + 3, `${sum(early)} -> ${sum(later)}`);
check('scroll-lit: starts dim', early.at(-1) < 0.3);
await page.screenshot({ path: out + 'm3-scroll-text.png' });

// Counters
await top(page, 'm4');
await page.waitForTimeout(400);
const mid = await page.locator('#m4 p.text-shimmer').nth(1).innerText();
await page.waitForTimeout(2600);
const end = await page.locator('#m4 p.text-shimmer').nth(1).innerText();
check('counters: count up to the real number', mid !== '340' && end === '340', `${mid} -> ${end}`);
check('counters: decimals kept', (await page.locator('#m4 p.text-shimmer').nth(3).innerText()) === '4.9★');
check('entrance: rise animation played and cleaned up', !(await page.locator('#m4 > div').evaluate((e) => e.className)).includes('anim'));
await page.screenshot({ path: out + 'm4-counters.png' });

// Logo strip
const pos = () =>
  page
    .locator('#m2 .flex.w-max')
    .first()
    .evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
await top(page, 'm2');
const x1 = await pos();
await page.waitForTimeout(700);
check('logos: the strip keeps moving', (await pos()) < x1 - 5);

// Horizontal scroll
await top(page, 'm5');
await page.waitForTimeout(300);
const trackX = () =>
  page
    .locator('#m5 [style*="translateX"]')
    .first()
    .evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
const h = await page.locator('#m5 section').evaluate((s) => s.offsetHeight);
check('horizontal: the section is pinned (taller than the screen)', h > 1200, String(h));
const tx0 = await trackX();
await page.mouse.wheel(0, 0);
await page.evaluate((d) => window.scrollBy(0, d), (h - 900) / 2);
await page.waitForTimeout(400);
const tx1 = await trackX();
check('horizontal: cards slide sideways while scrolling down', tx1 < tx0 - 200, `${tx0} -> ${tx1}`);
check(
  'horizontal: the panel stays on screen',
  Math.abs(await page.locator('#m5 .sticky').evaluate((e) => e.getBoundingClientRect().top)) < 2,
);
await page.screenshot({ path: out + 'm5-horizontal.png' });

// Tilt cards
await top(page, 'm6');
await page.waitForTimeout(1400);
const card = page.locator('#m6 article').first();
const b = await card.boundingBox();
await page.mouse.move(b.x + b.width * 0.85, b.y + b.height * 0.2);
await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.15);
await page.waitForTimeout(200);
check('tilt: card tilts toward the mouse', (await card.evaluate((e) => e.style.transform)).includes('rotateY'));
await page.screenshot({ path: out + 'm6-tilt.png' });
await page.mouse.move(5, 5);

// Flip cards
await top(page, 'm7');
await page.waitForTimeout(1400);
await page.locator('#m7 .flip').nth(1).hover();
await page.waitForTimeout(900);
check(
  'flip: card turns over on hover',
  (await page
    .locator('#m7 .flip-inner')
    .nth(1)
    .evaluate((e) => getComputedStyle(e).transform)) !== 'none',
);
await page.screenshot({ path: out + 'm7-flip.png' });
await page.mouse.move(5, 5);

// Before / after
await top(page, 'm8');
await page.waitForTimeout(900);
const clip = () => page.locator('#m8 [style*="clip-path"]').evaluate((e) => e.style.clipPath);
const c1 = await clip();
await page.waitForTimeout(500);
check('before/after: handle sweeps once as a hint', (await clip()) !== c1);
await page.waitForTimeout(1500);
await page.locator('#m8 input[type=range]').focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
check('before/after: keyboard moves the handle', (await clip()) !== 'inset(0px 50% 0px 0px)');
await page.screenshot({ path: out + 'm8-before-after.png' });

// Testimonials
await top(page, 'm9');
const q1 = await page.locator('#m9 blockquote').innerText();
await page.mouse.move(5, 5);
await page.waitForTimeout(7000);
check('testimonials: next quote after its time', (await page.locator('#m9 blockquote').innerText()) !== q1);
await page.locator('#m9 [role=tab]').nth(2).click();
await page.waitForTimeout(900);
check('testimonials: clicking a bar jumps to that quote', (await page.locator('#m9 figcaption').innerText()).includes('Nora'));
await page.screenshot({ path: out + 'm9-testimonials.png' });

// Timeline
await page.evaluate(() => window.scrollTo(0, document.getElementById('m10').getBoundingClientRect().top + scrollY - 300));
await page.waitForTimeout(500);
const lineA = await page.locator('#m10 .origin-top').evaluate((e) => e.style.transform);
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(800);
const lineB = await page.locator('#m10 .origin-top').evaluate((e) => e.style.transform);
const sc = (s) => Number(/scaleY\(([\d.]+)\)/.exec(s)?.[1] ?? 0);
check('timeline: the line draws as you scroll', sc(lineB) > sc(lineA), `${lineA} -> ${lineB}`);
await page.screenshot({ path: out + 'm10-timeline.png' });

// Reveal entrance on the last block
await top(page, 'm11');
await page.waitForTimeout(400);
await page.screenshot({ path: out + 'm11-reveal-mid.png' });
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'm11-reveal-done.png' });

// Reduced motion: everything visible and final straight away
const calm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
watch(calm);
await calm.goto(`${BASE}/en/motion`, { waitUntil: 'networkidle' });
check('reduced motion: blocks are not hidden', (await calm.locator('.anim').count()) === 0);
check('reduced motion: counters show final numbers', (await calm.locator('#m4 p.text-shimmer').nth(1).innerText()) === '340');
check('reduced motion: horizontal scroll is a plain row', (await calm.locator('#m5 section').evaluate((s) => s.offsetHeight)) < 1200);

// Persian on a phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone);
await phone.goto(`${BASE}/fa/motion`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(1500);
await phone.screenshot({ path: out + 'fa-mobile-m1.png' });
for (const id of ['m4', 'm5', 'm7', 'm10']) {
  await top(phone, id);
  await phone.waitForTimeout(1600);
  await phone.screenshot({ path: `${out}fa-mobile-${id}.png` });
}
check('phone: no sideways scrolling', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('phone: horizontal scroll becomes a swipe row', (await phone.locator('#m5 .snap-x').count()) === 1);
check('phone: Persian digits in counters', /[۰-۹]/.test(await phone.locator('#m4 p.text-shimmer').nth(1).innerText()));

// Editor: Animated group and replaying an entrance animation
const ed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ed);
await ed.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ed.fill('input[type=email]', ADMIN.email);
await ed.fill('input[type=password]', ADMIN.password);
await ed.click('button[type=submit]');
await ed.waitForURL(`${BASE}/admin`);
await ed.locator('article', { hasText: 'Motion' }).getByText('Edit').click();
await ed.waitForSelector('main [id^=blk-]');
check(
  'editor: Animated group lists 12 blocks',
  (await ed
    .locator('aside h3', { hasText: /^Animated$/ })
    .locator('xpath=following-sibling::div[1]/button')
    .count()) === 12,
);
await ed.screenshot({ path: out + 'editor-animated.png' });
await ed.locator('main [id^=blk-m2]').click({ position: { x: 30, y: 20 } });
await ed.locator('aside').last().locator('summary:has-text("Animation, anchor and visibility")').click();
const select = ed
  .locator('aside')
  .last()
  .locator('select')
  .filter({ has: ed.locator('option[value="flip"]') });
await select.selectOption('zoom');
await ed.waitForTimeout(150);
check('editor: choosing an animation replays it on the canvas', (await ed.locator('main [id^=blk-m2] [class*="anim-zoom"]').count()) === 1);
await ed.waitForTimeout(1500);
await ed.screenshot({ path: out + 'editor-animation-field.png' });

await browser.close();
finish();
