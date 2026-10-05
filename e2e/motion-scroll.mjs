// Parallax layers, sticky story, zoom-in picture, stacking cards, scroll-moved words, opening picture, floating photos,
// cursor effects and page transitions.
import { ADMIN, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('motion-scroll');
const browser = await launch();

// "translate3d(Xpx, Ypx, 0)" from inline styles, or "matrix(a, b, c, d, e, f)" from computed styles.
const nums = (s) => (String(s).match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number);
const tx = (s) => (String(s).startsWith('matrix') ? nums(s)[4] : nums(s)[1]) ?? 0;
const ty = (s) => (String(s).startsWith('matrix') ? nums(s)[5] : nums(s)[2]) ?? 0;

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/motion`);
await page.waitForTimeout(150);
await page.screenshot({ path: out + 'transition-enter-start.png' });

// Page transition: the curtain uncovers the page on load
check('transition: curtain is in the server page', (await page.locator('.pt.pt-curtain.pt-enter').count()) === 1);
await page.waitForTimeout(1300);
const panelDone = await page.locator('.pt-panel-1').evaluate((e) => getComputedStyle(e).transform);
check('transition: curtain has opened', nums(panelDone)[0] === 0, panelDone);

// Cursor: dot and trailing ring
await page.mouse.move(400, 400);
await page.mouse.move(600, 450, { steps: 8 });
await page.waitForTimeout(400);
check('cursor: system pointer replaced', await page.evaluate(() => document.documentElement.classList.contains('cursor-replaced')));
const ringPos = await page
  .locator('.cursor-replaced ~ * [class*="border-primary"], [aria-hidden="true"] .border-primary')
  .first()
  .evaluate((e) => e.parentElement.style.transform);
// It trails behind on purpose, so it is near the pointer rather than exactly on it.
check('cursor: ring follows the mouse', Math.abs(tx(ringPos) - 600) < 20 && Math.abs(ty(ringPos) - 450) < 20, ringPos);
const link = page.locator('#m1 a').first();
const lb = await link.boundingBox();
await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2, { steps: 6 });
await page.waitForTimeout(400);
check(
  'cursor: ring grows over links',
  await page.locator('.fixed.z-\\[90\\] .border-primary').evaluate((e) => e.className.includes('scale-[1.8]')),
);
await page.screenshot({ path: out + 'cursor-ring-link.png' });

// Parallax
await page.evaluate(() => window.scrollTo(0, document.getElementById('m12').getBoundingClientRect().top + scrollY - 450));
await page.waitForTimeout(400);
const layers = page.locator('#m12 section > div.will-change-transform');
const before = await layers.evaluateAll((ls) => ls.map((l) => l.style.transform));
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(400);
const after = await layers.evaluateAll((ls) => ls.map((l) => l.style.transform));
const moved = after.map((a, i) => Math.abs(ty(a) - ty(before[i])));
check(
  'parallax: layers move as you scroll',
  moved.every((m) => m > 5),
  JSON.stringify(moved),
);
check('parallax: front layers move faster than the back one', moved[moved.length - 1] > moved[0] * 2, JSON.stringify(moved));
await page.screenshot({ path: out + 'parallax.png' });
const sb = await page.locator('#m12 section').boundingBox();
const x0 = tx(await layers.last().evaluate((l) => l.style.transform));
await page.mouse.move(sb.x + 100, sb.y + sb.height / 2, { steps: 5 });
await page.mouse.move(sb.x + sb.width - 100, sb.y + sb.height / 2, { steps: 20 });
await page.waitForTimeout(900);
check('parallax: layers follow the mouse', Math.abs(tx(await layers.last().evaluate((l) => l.style.transform)) - x0) > 10);

// Sticky story
await page.evaluate(() => window.scrollTo(0, document.getElementById('m13').getBoundingClientRect().top + scrollY));
await page.waitForTimeout(600);
const stickyTop = () => page.locator('#m13 .sticky').evaluate((e) => Math.round(e.getBoundingClientRect().top));
const activeImg = () =>
  page.locator('#m13 .sticky > div.absolute').evaluateAll((ds) => ds.findIndex((d) => d.className.includes('opacity-100')));
const firstTop = await stickyTop();
await page
  .locator('#m13 li[data-step="2"]')
  .evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top + e.offsetHeight / 2 - innerHeight / 2));
await page.waitForTimeout(900);
check(
  'sticky story: picture stays pinned at 12% of the screen',
  Math.abs((await stickyTop()) - 108) <= 2,
  `${firstTop} -> ${await stickyTop()}`,
);
check('sticky story: picture changes to the current step', (await activeImg()) === 2, String(await activeImg()));
await page.screenshot({ path: out + 'sticky-story.png' });

/** Scrolls so the block's top is `fraction` of the way through its pinned length (its height less one screen). */
const through = (id, fraction) =>
  page.evaluate(
    ([id, f]) => {
      const el = document.getElementById(id);
      const s = el.querySelector('section') ?? el;
      window.scrollTo(0, s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * f);
    },
    [id, fraction],
  );

// Zoom-in picture
const clip = async () => nums(await page.locator('#m14 [style*="clip-path"]').evaluate((e) => e.style.clipPath));
await through('m14', 0);
await page.waitForTimeout(300);
const small = await clip();
check('zoom-in: picture starts small and rounded', small[0] > 20 && small[1] > 25, JSON.stringify(small));
await page.screenshot({ path: out + 'zoom-start.png' });
await through('m14', 0.95);
await page.waitForTimeout(300);
const full = await clip();
check('zoom-in: picture fills the screen', full[0] < 0.5 && full[1] < 0.5, JSON.stringify(full));
check(
  'zoom-in: title has faded in',
  Number(await page.locator('#m14 h2').evaluate((e) => getComputedStyle(e.parentElement).opacity)) > 0.9,
);
await page.screenshot({ path: out + 'zoom-end.png' });

// Stacking cards
const scales = async () =>
  (await page.locator('#m15 article').evaluateAll((as) => as.map((a) => a.style.transform))).map((t) => nums(t)[0]);
await page
  .locator('#m15 article')
  .last()
  .evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top - innerHeight * 0.12 - 60));
await page.waitForTimeout(400);
const stack = await scales();
check(
  'stacking: cards underneath shrink, the top one does not',
  stack[0] < stack[2] && stack[2] < 1 && stack.at(-1) === 1,
  JSON.stringify(stack),
);
check(
  'stacking: cards pile up at the top of the screen',
  await page.locator('#m15 .sticky').evaluateAll((ds) => ds.every((d, i) => Math.abs(d.getBoundingClientRect().top - (108 + i * 20)) <= 2)),
);
await page.screenshot({ path: out + 'stacking.png' });

// Scroll-moved words
const rows = () => page.locator('#m16 section > div > div').evaluateAll((rs) => rs.map((r) => r.getBoundingClientRect().left));
await page.evaluate(() => window.scrollTo(0, document.getElementById('m16').getBoundingClientRect().top + scrollY - innerHeight / 2));
await page.waitForTimeout(300);
const r0 = await rows();
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(300);
const r1 = await rows();
check('scroll words: rows move with the scroll, in opposite directions', r1[0] < r0[0] - 20 && r1[1] > r0[1] + 20, `${r0} -> ${r1}`);
await page.waitForTimeout(500);
check('scroll words: and stop when the scrolling stops', JSON.stringify(await rows()) === JSON.stringify(r1));
await page.screenshot({ path: out + 'scroll-words.png' });

// Opening picture
const doors = () =>
  page
    .locator('#m17 .will-change-transform')
    .evaluateAll((ds) => [...ds.map((d) => d.getBoundingClientRect().left), document.documentElement.clientWidth]);
await through('m17', 0);
await page.waitForTimeout(300);
const shut = await doors();
check('opening: the halves meet in the middle', Math.abs(shut[0]) < 2 && Math.abs(shut[1] - shut[2] / 2) < 2, JSON.stringify(shut));
await page.screenshot({ path: out + 'opening-shut.png' });
await through('m17', 0.5);
await page.waitForTimeout(300);
await page.screenshot({ path: out + 'opening-half.png' });
await through('m17', 0.9);
await page.waitForTimeout(300);
const opened = await doors();
check('opening: the halves slide off the screen', opened[0] <= 1 - opened[2] / 2 && opened[1] >= opened[2] - 1, JSON.stringify(opened));
check(
  'opening: the message behind can be clicked',
  await page.locator('#m17 a', { hasText: 'Ask us one' }).evaluate((a) => {
    const r = a.getBoundingClientRect();
    return a.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }),
);

// Floating photos
const photoTops = () => page.locator('#m18 figure').evaluateAll((fs) => fs.map((f) => f.getBoundingClientRect().top));
await page.evaluate(() => window.scrollTo(0, document.getElementById('m18').getBoundingClientRect().top + scrollY));
await page.waitForTimeout(300);
const f0 = await photoTops();
await page.evaluate(() => window.scrollBy(0, 400));
await page.waitForTimeout(300);
const f1 = await photoTops();
const drift = f1.map((t, i) => f0[i] - t);
// Photo 2 is near (fast), photo 1 is far (slow); both move further than the page did.
check('floating: near photos drift faster than far ones', drift[1] > drift[0] + 30 && drift[0] > 400, JSON.stringify(drift));
check(
  'floating: the title stays in the middle of the screen',
  Math.abs(await page.locator('#m18 h2').evaluate((e) => e.getBoundingClientRect().top + e.offsetHeight / 2 - innerHeight / 2)) < 120,
);
await page.screenshot({ path: out + 'floating.png' });

// Page transition: clicking an internal link covers the page, then loads the next one
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const contact = page.locator('header a', { hasText: 'Contact' }).first();
await contact.click();
await page.waitForTimeout(250);
check('transition: link click covers the page first', (await page.locator('.pt.pt-leave').count()) === 1);
await page.screenshot({ path: out + 'transition-leave.png' });
await page.waitForURL(/\/en\/contact/, { timeout: 5000 }).catch(() => null);
check('transition: then the next page loads', page.url().endsWith('/en/contact'));
await page.goBack();
await page.waitForTimeout(800);
check('transition: back button shows the page uncovered', (await page.locator('.pt.pt-leave').count()) === 0);

// Reduced motion and touch screens
const calm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
watch(calm);
await calm.goto(`${BASE}/en/motion`, { waitUntil: 'networkidle' });
check('reduced motion: no transition overlay', await calm.locator('.pt').evaluate((e) => getComputedStyle(e).display === 'none'));
check('reduced motion: zoom-in picture is shown whole', (await calm.locator('#m14 [style*="clip-path"]').count()) === 0);
check('reduced motion: opening picture holds still', (await calm.locator('#m17 .will-change-transform').count()) === 0);
check('reduced motion: normal pointer', !(await calm.evaluate(() => document.documentElement.classList.contains('cursor-replaced'))));
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
watch(phone);
await phone.goto(`${BASE}/fa/motion`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(1300);
check('touch: no custom pointer', (await phone.locator('.fixed.z-\\[90\\]').count()) === 0);
for (const id of ['m12', 'm13']) {
  await phone.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY), id);
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: `${out}fa-mobile-${id}.png` });
}
check('phone: sticky story shows each picture inline', (await phone.locator('#m13 li img:visible').count()) === 4);
check('phone: no sideways scrolling', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// Editor: Motion settings in the Design tab, previewed on the canvas
const ed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ed);
await ed.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await ed.fill('input[type=email]', ADMIN.email);
await ed.fill('input[type=password]', ADMIN.password);
await ed.click('button[type=submit]');
await ed.waitForURL(`${BASE}/admin`);
await ed.locator('article', { hasText: 'Motion' }).getByText('Edit').click();
await ed.waitForSelector('main [id^=blk-]');
await ed.click('aside >> text=Design');
check('editor: page uses its own theme', (await ed.locator('#theme-transition').inputValue()) === 'curtain');
await ed.selectOption('#theme-transition', 'circle');
await ed.waitForTimeout(150);
check('editor: changing the transition replays it on the canvas', (await ed.locator('main .pt.pt-circle.pt-enter').count()) === 1);
await ed.screenshot({ path: out + 'editor-transition-preview.png' });
await ed.selectOption('#theme-cursor', 'blend');
await ed.waitForTimeout(200);
const cb = await ed.locator('main [id^=blk-m2]').boundingBox();
await ed.mouse.move(cb.x + 300, cb.y + 60, { steps: 5 });
await ed.waitForTimeout(400);
check('editor: cursor preview over the canvas', (await ed.locator('main .mix-blend-difference').count()) === 1);
await ed.locator('aside button[title="Use the Sand theme"]').click();
check(
  'editor: a ready-made theme keeps the motion settings',
  (await ed.locator('#theme-transition').inputValue()) === 'circle' && (await ed.locator('#theme-cursor').inputValue()) === 'blend',
);
await ed.screenshot({ path: out + 'editor-motion-settings.png' });

await browser.close();
finish();
