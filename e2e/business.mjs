// The business picker in Site settings, and the structured data (JSON-LD) it gives the home page.
import { adminLogin, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('business');
const browser = await launch();
const ad = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });

// Category first, then the kind of business.
await ad.click('button:has-text("Food & drink")');
check('business: a category shows its kinds', (await ad.locator('button:has-text("Café or coffee shop")').count()) === 1);
await ad.screenshot({ path: `${out}category.png`, fullPage: false });
await ad.click('button:has-text("Café or coffee shop")');
check('business: the choice is shown with its category', (await ad.locator('text=Food & drink').count()) >= 1);

// Searching finds a kind in any category, in either language.
await ad.click('button:has-text("Change")');
await ad.fill('input[type=search]', 'دندان');
check('business: search matches Persian labels', (await ad.locator('button:has-text("Dentist")').count()) === 1);
await ad.fill('input[type=search]', 'cafe');
check('business: search ignores accents', (await ad.locator('button:has-text("Café or coffee shop")').count()) === 1);
await ad.click('button:has-text("Café or coffee shop")');

await ad.fill('#biz-phone', '+98 21 1234 5678');
await ad.fill('#biz-city', 'Tehran');
await ad.fill('#biz-price', '$$');
await ad.fill('#biz-profiles', 'https://instagram.com/beanthere\njavascript:alert(1)');
await ad.locator('#biz-profiles').blur();
await ad.screenshot({ path: `${out}details.png`, fullPage: true });
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');

// The home page now describes the café.
const html = await (await fetch(`${BASE}/en`)).text();
const json = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
const data = json ? JSON.parse(json) : null;
const owner = data?.['@graph']?.[0];
check('business: home page has JSON-LD of the chosen type', owner?.['@type'] === 'CafeOrCoffeeShop', json);
check('business: details are included', owner?.telephone === '+98 21 1234 5678' && owner?.address?.addressLocality === 'Tehran');
check('business: unsafe profile links are dropped', JSON.stringify(owner?.sameAs) === '["https://instagram.com/beanthere"]');
check('business: the site is described too', data?.['@graph']?.[1]?.['@type'] === 'WebSite');
const inner = await (await fetch(`${BASE}/en/contact`)).text();
check('business: other pages do not repeat it', !inner.includes('application/ld+json'));

// Removing the choice removes the structured data.
await ad.reload({ waitUntil: 'networkidle' });
await ad.click('button[aria-label="Remove"]');
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');
check('business: no type, no JSON-LD', !(await (await fetch(`${BASE}/en`)).text()).includes('application/ld+json'));

await browser.close();
finish();
