// Decoding text, photo trail, hover-reveal list, spinning badge, expanding panels, skill bars, picture in letters,
// orbiting icons, fanning cards and endless photo columns.
import { BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('motion-more');
const browser = await launch();
const nums = (s) => (String(s).match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number);
/** Degrees from a computed "matrix(a, b, …)" transform. */
const degrees = (m) => {
  const [a, b] = nums(m);
  return m === 'none' ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
};

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/motion`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
const show = async (id, offset = 0) => {
  await page.evaluate(([id, o]) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + o), [id, offset]);
  await page.waitForTimeout(150);
};
/** Scrolls so the block's top is `fraction` of the way through its pinned length (its height less one screen). */
const through = (id, fraction) =>
  page.evaluate(
    ([id, f]) => {
      const s = document.getElementById(id).querySelector('section');
      window.scrollTo(0, s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * f);
    },
    [id, fraction],
  );

// Decoding text
const line = () => page.locator('#m19 h2 [aria-hidden=true]').textContent();
check(
  'decoding: every line is there for screen readers',
  (await page.locator('#m19 h2 .sr-only').textContent()) === 'We design. We build. We launch.',
);
await show('m19', -200);
await page.waitForTimeout(3250);
const scrambled = await line();
check('decoding: the next line arrives scrambled', !['We design.', 'We build.'].includes(scrambled) && scrambled.length === 9, scrambled);
await page.screenshot({ path: out + 'decoding.png' });
await page.waitForTimeout(1000);
check('decoding: then settles', (await line()) === 'We build.', await line());

// Photo trail
await show('m20');
check('trail: the row of photos is for touch screens only', !(await page.locator('#m20 ul').isVisible()));
const box = await page.locator('#m20 section').boundingBox();
await page.mouse.move(box.x + 100, box.y + 200);
await page.mouse.move(box.x + box.width - 100, box.y + 500, { steps: 40 });
await page.waitForTimeout(250);
const trail = await page.locator('#m20 .trail-photo').count();
check('trail: moving the mouse leaves photos', trail >= 5 && trail <= 10, String(trail));
await page.screenshot({ path: out + 'trail.png' });
await page.waitForTimeout(1400);
check('trail: and they fade away', (await page.locator('#m20 .trail-photo').count()) === 0);

// Hover-reveal list
await show('m21', -100);
const row = page.locator('#m21 li').nth(1);
const rb = await row.boundingBox();
await page.mouse.move(rb.x + 300, rb.y + rb.height / 2, { steps: 4 });
await page.mouse.move(rb.x + 500, rb.y + rb.height / 2, { steps: 8 });
await page.waitForTimeout(700);
const preview = await page.locator('#m21 [aria-hidden=true] > div').boundingBox();
check(
  'hover list: the photo appears at the mouse',
  Math.abs(preview.x + preview.width / 2 - (rb.x + 500)) < 30 && Math.abs(preview.y + preview.height / 2 - (rb.y + rb.height / 2)) < 30,
  JSON.stringify(preview),
);
check(
  'hover list: other rows dim',
  (await page.locator('#m21 li').evaluateAll((ls) => ls.map((l) => getComputedStyle(l.firstElementChild).opacity))).join() ===
    '0.3,1,0.3,0.3',
);
check('hover list: no thumbnails with a mouse', !(await page.locator('#m21 .thumb-only').first().isVisible()));
await page.screenshot({ path: out + 'hover-list.png' });
await page.mouse.move(5, 5);

// Spinning badge
await show('m22', -200);
const turn = () => page.locator('#m22 svg').evaluate((e) => getComputedStyle(e).transform);
const a0 = degrees(await turn());
await page.waitForTimeout(500);
const a1 = degrees(await turn());
check('badge: turns on its own', (a1 - a0 + 360) % 360 > 3 && (a1 - a0 + 360) % 360 < 15, `${a0} -> ${a1}`);
await page.evaluate(() => window.scrollBy(0, 250));
await page.waitForTimeout(300);
const a2 = degrees(await turn());
await page.waitForTimeout(300);
const a3 = degrees(await turn());
check('badge: scrolling spins it faster', (a3 - a2 + 360) % 360 > 30, `${a2} -> ${a3}`);
await page.screenshot({ path: out + 'badge.png' });

// Expanding panels
await show('m23', -50);
const widths = () => page.locator('#m23 article').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().width));
const w0 = await widths();
check('panels: the first one starts open', w0[0] > w0[1] * 3, JSON.stringify(w0));
const third = await page.locator('#m23 article').nth(2).boundingBox();
await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2, { steps: 4 });
await page.waitForTimeout(1000);
const w1 = await widths();
check('panels: pointing at one widens it', w1[2] > w1[0] * 3, JSON.stringify(w1));
await page.screenshot({ path: out + 'panels.png' });
await page.mouse.move(5, 5);

// Skill bars
const bars = async () =>
  (await page.locator('#m24 [role=progressbar] > div').evaluateAll((ds) => ds.map((d) => d.style.transform))).map((t) => nums(t)[0]);
check(
  'bars: empty before they are seen',
  (await bars()).every((s) => s === 0),
);
await show('m24', -200);
await page.waitForTimeout(500);
const filling = await bars();
check('bars: fill one after another', filling[0] > filling[3] && filling[0] < 1, JSON.stringify(filling));
await page.waitForTimeout(2000);
check(
  'bars: then full',
  (await bars()).every((s) => s === 1),
);
check('bars: with their percentage', (await page.locator('#m24 li').first().textContent()).includes('95%'));
await page.screenshot({ path: out + 'bars.png' });

// Picture in letters
const word = page.locator('#m25 h2');
check('letters: the photo is cut out by the letters', (await word.evaluate((e) => getComputedStyle(e).backgroundClip)) === 'text');
await show('m25', -700);
const p0 = await word.evaluate((e) => e.style.backgroundPosition);
await show('m25', -100);
const p1 = await word.evaluate((e) => e.style.backgroundPosition);
check('letters: the photo glides with the scroll', nums(p1)[0] > nums(p0)[0] + 10, `${p0} -> ${p1}`);
await page.screenshot({ path: out + 'letters.png' });

// Orbiting icons
await show('m26');
const rings = () => page.locator('#m26 .orbit-ring').evaluateAll((rs) => rs.slice(0, 1).map((r) => getComputedStyle(r).transform));
const o0 = degrees((await rings())[0]);
await page.waitForTimeout(600);
const o1 = degrees((await rings())[0]);
check('orbit: the rings turn', Math.abs(o1 - o0) > 2, `${o0} -> ${o1}`);
check(
  'orbit: icons stay upright',
  await page
    .locator('#m26 .orbit-counter')
    .evaluateAll((cs) => cs.every((c) => Math.abs(c.getBoundingClientRect().width - c.offsetWidth) < 1)),
);
const ob = await page.locator('#m26 .orbit').boundingBox();
await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2);
await page.waitForTimeout(100);
const o2 = degrees((await rings())[0]);
await page.waitForTimeout(500);
check('orbit: pauses while pointed at', degrees((await rings())[0]) === o2);
await page.screenshot({ path: out + 'orbit.png' });
await page.mouse.move(5, 5);

// Fanning cards
const centers = () =>
  page.locator('#m27 article').evaluateAll((as) =>
    as.map((a) => {
      const r = a.getBoundingClientRect();
      return Math.round(r.x + r.width / 2);
    }),
  );
await through('m27', 0);
await page.waitForTimeout(300);
const pile = await centers();
check('fan: cards start in a pile', Math.max(...pile) - Math.min(...pile) < 5, JSON.stringify(pile));
await page.screenshot({ path: out + 'fan-pile.png' });
await through('m27', 0.9);
await page.waitForTimeout(300);
const fan = await centers();
check(
  'fan: then spread out in order',
  fan.every((c, i) => i === 0 || c > fan[i - 1] + 150),
  JSON.stringify(fan),
);
check(
  'fan: and stay on the screen',
  await page
    .locator('#m27 article')
    .evaluateAll((as) => as.every((a) => a.getBoundingClientRect().left >= 0 && a.getBoundingClientRect().right <= innerWidth)),
);
await page.screenshot({ path: out + 'fan-open.png' });

// Endless photo columns
await show('m28');
const cols = () => page.locator('#m28 .photo-column').evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().top));
const c0 = await cols();
await page.waitForTimeout(800);
const c1 = await cols();
check('columns: glide, the middle one the other way', c1[0] < c0[0] && c1[1] > c0[1] && c1[2] < c0[2], `${c0} -> ${c1}`);
await page.screenshot({ path: out + 'columns.png' });

check('desktop: no sideways scrolling', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// Reduced motion
const calm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
watch(calm);
await calm.goto(`${BASE}/en/motion`, { waitUntil: 'networkidle' });
await calm.evaluate(() => document.getElementById('m24').scrollIntoView());
await calm.waitForTimeout(400);
check(
  'reduced motion: bars are full at once',
  (await calm.locator('#m24 [role=progressbar] > div').evaluateAll((ds) => ds.map((d) => d.style.transform))).every(
    (t) => t === 'scaleX(1)',
  ),
);
check(
  'reduced motion: orbit stands still',
  await calm
    .locator('#m26 .orbit-ring')
    .first()
    .evaluate((e) => getComputedStyle(e).animationName === 'none'),
);
check(
  'reduced motion: columns stand still',
  await calm
    .locator('#m28 .photo-column')
    .first()
    .evaluate((e) => getComputedStyle(e).animationName === 'none'),
);
check('reduced motion: cards are a plain row', await calm.locator('#m27 section').evaluate((s) => s.offsetHeight < innerHeight * 1.5));
check('reduced motion: photos sit in a row instead of a trail', await calm.locator('#m20 ul').isVisible());
await calm.evaluate(() => document.getElementById('m19').scrollIntoView());
await calm.waitForTimeout(3500);
check(
  'reduced motion: decoding text keeps its first line',
  (await calm.locator('#m19 h2 [aria-hidden=true]').textContent()) === 'We design.',
);

// Phone, Persian
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
watch(phone);
await phone.goto(`${BASE}/fa/motion`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(1300);
check('phone: photo trail shows its row', await phone.locator('#m20 ul').isVisible());
check('phone: Persian badge words run round the circle', (await phone.locator('#m22 text').evaluate((t) => t.getBBox().width)) > 150);
check('phone: hover list shows thumbnails', (await phone.locator('#m21 .thumb-only:visible').count()) === 4);
for (const id of ['m19', 'm20', 'm21', 'm22', 'm23', 'm24', 'm25', 'm26', 'm28']) {
  await phone.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY), id);
  await phone.waitForTimeout(600);
  await phone.screenshot({ path: `${out}fa-mobile-${id}.png` });
}
await phone.evaluate(() => {
  const s = document.querySelector('#m27 section');
  window.scrollTo(0, s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * 0.9);
});
await phone.waitForTimeout(600);
await phone.screenshot({ path: `${out}fa-mobile-m27.png` });
check(
  'phone: the fan fits the screen',
  await phone
    .locator('#m27 article')
    .evaluateAll((as) => as.every((a) => a.getBoundingClientRect().left >= -1 && a.getBoundingClientRect().right <= innerWidth + 1)),
);
check(
  'phone: first card on the right in Persian',
  await phone.locator('#m27 article').evaluateAll((as) => as[0].getBoundingClientRect().left > as.at(-1).getBoundingClientRect().left),
);
check('phone: no sideways scrolling', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

await browser.close();
finish();
