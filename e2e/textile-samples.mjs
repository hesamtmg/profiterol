// The sublimation designer's real-world photos: each product shows photos of prints made for customers.
import { createBlock } from '../packages/blocks/dist/esm/index.js';
import { api, apiToken, BASE, check, finish, launch, photo, shots, upload, watch } from './lib.mjs';

const out = shots('textile-samples');
const browser = await launch();
const token = await apiToken();

const shirt1 = await upload(token, await photo({ from: '#1d4ed8', to: '#f472b6', label: 'Team' }), 'shirt1.jpg', 'image/jpeg');
const shirt2 = await upload(token, await photo({ from: '#065f46', to: '#facc15', label: 'Cafe' }), 'shirt2.jpg', 'image/jpeg');
const pillow = await upload(token, await photo({ from: '#7c2d12', to: '#fde68a', label: 'Pillow' }), 'pillow.jpg', 'image/jpeg');

const block = createBlock('textile-designer');
block.props.products[0].photos = [
  { image: shirt1, caption: 'Football team shirts' },
  { image: shirt2, caption: '' },
];
block.props.products[2].photos = [{ image: pillow, caption: 'Wedding cushion' }];

const page0 = await api(token, 'POST', '/admin/pages', { name: 'Print samples' });
await api(token, 'PATCH', `/admin/pages/${page0.id}`, {
  name: page0.name,
  translations: [
    { locale: 'en', slug: 'print-samples', title: 'Print samples', blocks: [block] },
    { locale: 'fa', slug: 'نمونه-چاپ', title: 'نمونه چاپ', blocks: [block] },
  ],
});
await api(token, 'POST', `/admin/pages/${page0.id}/publish`);

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
watch(page);
await page.goto(`${BASE}/en/print-samples`, { waitUntil: 'networkidle' });
const strip = page.getByText('Made for our customers');
await strip.scrollIntoViewIfNeeded();
check('the first product shows its photos', (await strip.count()) === 1);
check('one thumbnail per photo', (await page.locator(`img[src="${shirt1}"], img[src="${shirt2}"]`).count()) === 2);
check('captions are shown', await page.getByText('Football team shirts').isVisible());
await page.screenshot({ path: out + 'en-product.png' });

await page.locator(`img[src="${shirt1}"]`).click();
const dialog = page.locator('[role="dialog"]');
check('a photo opens full screen', await dialog.isVisible());
await page.screenshot({ path: out + 'en-lightbox.png' });
await page.keyboard.press('ArrowRight');
check('arrow keys go to the next photo', (await dialog.locator(`img[src="${shirt2}"]`).count()) === 1);
await page.keyboard.press('Escape');
check('Esc closes it', (await dialog.count()) === 0);

await page.getByRole('button', { name: 'Hoodie' }).click();
check('a product without photos shows none', (await strip.count()) === 0);
await page.getByRole('button', { name: 'Cushion' }).click();
check('each product shows its own photos', (await page.locator(`img[src="${pillow}"]`).count()) === 1);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(mobile);
await mobile.goto(`${BASE}/fa/${encodeURIComponent('نمونه-چاپ')}`, { waitUntil: 'networkidle' });
const faStrip = mobile.getByText('نمونه‌های چاپ‌شده برای مشتری‌ها');
check('Persian heading', (await faStrip.count()) === 1);
await faStrip.scrollIntoViewIfNeeded();
check('no sideways scroll on a phone', await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await mobile.screenshot({ path: out + 'fa-mobile.png' });

await api(token, 'DELETE', `/admin/pages/${page0.id}`);
await browser.close();
finish();
