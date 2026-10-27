// The whitecotton.pt look: the ten Atelier blocks and the "Atelier Cream" theme.
import { createBlock } from '../packages/blocks/dist/esm/index.js';
import { api, apiToken, BASE, check, finish, launch, photo, shots, upload, watch } from './lib.mjs';

const out = shots('atelier');
const browser = await launch();
const token = await apiToken();

const pic = await upload(token, await photo({ from: '#3a2c25', to: '#c9b49c' }), 'atelier.jpg', 'image/jpeg');
const types = [
  'craft-hero',
  'step-cards',
  'showroom',
  'story-tabs',
  'place-photos',
  'capability-stack',
  'swatch-library',
  'quote-fan',
  'place-facts',
  'photo-cta',
];
const blocks = types.map((type) => createBlock(type));
const byType = (type) => blocks.find((b) => b.type === type).props;
byType('craft-hero').image = pic;
byType('showroom').items = [
  { image: pic, name: 'Mug', category: 'Drinkware', link: '' },
  { image: pic, name: 'Bottle', category: 'Drinkware', link: '' },
  { image: pic, name: 'T-shirt', category: 'Apparel', link: '' },
];
byType('swatch-library').swatches[0].text = 'Soft and bright.';
byType('quote-fan').seconds = 0;

const page0 = await api(token, 'POST', '/admin/pages', { name: 'Atelier look' });
const theme = { primary: '#6e4b3c', secondary: '#9b948d', background: '#f3efe8', surface: '#fbf9f5', dark: '#2b211c', fontEn: 'Manrope' };
await api(token, 'PATCH', `/admin/pages/${page0.id}`, {
  name: page0.name,
  theme,
  translations: [
    { locale: 'en', slug: 'atelier-look', title: 'Atelier look', blocks },
    { locale: 'fa', slug: 'نمای-کارگاهی', title: 'نمای کارگاهی', blocks },
  ],
});
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/atelier-look`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: out + 'hero.png' });

for (const type of types) check(`renders ${type}`, (await page.locator(`.pf-${type}`).count()) === 1);
check(
  'hero: the header floats over it',
  (await page
    .locator('header')
    .first()
    .evaluate((el) => getComputedStyle(el).position)) !== 'sticky',
);
check(
  'hero: the soft half of the title is italic',
  (await page.locator('.pf-craft-hero h1 em').evaluate((el) => getComputedStyle(el).fontStyle)) === 'italic',
);

// Showroom: tabs from the categories filter the shelf
const shelf = page.locator('.pf-showroom');
await shelf.scrollIntoViewIfNeeded();
check('showroom: one tab per category, plus "all"', (await shelf.locator('[role=tab]').count()) === 3);
await page.waitForTimeout(500);
await shelf.locator('[role=tab]', { hasText: 'Apparel' }).click();
const kept = await shelf
  .locator('img')
  .count()
  .then(async (n) => {
    for (let t = 0; t < 30 && n !== 1; t++) n = await page.waitForTimeout(100).then(() => shelf.locator('img').count());
    return n;
  });
check('showroom: a tab keeps only its products', kept === 1, `${kept} products shown`);
await page.screenshot({ path: out + 'showroom.png' });

// Story: the tabs change the text
const story = page.locator('.pf-story-tabs');
await story.scrollIntoViewIfNeeded();
await story.locator('[role=tab]').nth(2).click();
await page.waitForTimeout(800);
check('story: the third tab tells its part', (await story.innerText()).includes('We tell you what we can do'));

// Capabilities: the cards stick and pile up
const firstCard = page.locator('.pf-capability-stack article').first();
check(
  'capabilities: the cards stick while scrolling',
  (await firstCard.evaluate((el) => getComputedStyle(el.parentElement).position)) === 'sticky',
);

// Swatches: tapping one opens its details
const swatches = page.locator('.pf-swatch-library');
await swatches.scrollIntoViewIfNeeded();
await swatches.locator('button[aria-expanded]').first().click();
await page.waitForTimeout(400);
check('swatches: tapping one shows its details', (await swatches.innerText()).includes('Soft and bright.'));
await page.screenshot({ path: out + 'swatches.png' });

// Quotes: the arrows bring the next card to the middle
const fan = page.locator('.pf-quote-fan');
await fan.scrollIntoViewIfNeeded();
const lit = () => fan.locator('figure[aria-hidden=false] blockquote').innerText();
const first = await lit();
await fan.getByRole('button', { name: 'Next' }).click();
await page.waitForTimeout(800);
check('quotes: the arrow turns the arc', (await lit()) !== first, first);
await page.screenshot({ path: out + 'quotes.png' });

// Persian: right to left, the soft half of titles not slanted
await page.goto(`${BASE}/fa/${encodeURIComponent('نمای-کارگاهی')}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
check('fa: right to left', (await page.locator('html').getAttribute('dir')) === 'rtl');
check('fa: no slanted Persian', (await page.locator('.pf-step-cards h2 em').evaluate((el) => getComputedStyle(el).fontStyle)) === 'normal');
await page.screenshot({ path: out + 'fa-hero.png' });

await api(token, 'DELETE', `/admin/pages/${page0.id}`);
await browser.close();
finish();
