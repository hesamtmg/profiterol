// Custom CSS for the site and for one page, the link picker, the loader styles and no zoom on inputs.
import { adminLogin, api, apiToken, BASE, check, finish, launch, shots, watch } from './lib.mjs';

const out = shots('custom-css');
const browser = await launch();
const token = await apiToken();

// ---------- A page to style and to link to ----------
const target = await api(token, 'POST', '/admin/pages', { name: 'CSS target', template: 'blank' }).catch(() =>
  api(token, 'POST', '/admin/pages', { name: 'CSS target' }),
);
await api(token, 'PATCH', `/admin/pages/${target.id}`, {
  translations: target.translations.map((t) => ({
    locale: t.locale,
    title: 'CSS target',
    slug: t.slug,
    blocks: [
      { id: 'css-text', type: 'text', props: { title: 'Styled title', body: 'Body', align: 'start' } },
      {
        id: 'css-statement',
        type: 'statement',
        props: { title: 'Linked', text: '', image: '', fixedImage: false, buttonLabel: 'Go', buttonLink: '#contact' },
      },
    ],
  })),
});
await api(token, 'POST', `/admin/pages/${target.id}/publish`);
const enSlug = target.translations.find((t) => t.locale === 'en').slug;
const faSlug = target.translations.find((t) => t.locale === 'fa').slug;

const before = await api(token, 'GET', '/admin/settings');

// ---------- Site settings: site CSS and a new loader style ----------
const ad = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(ad);
await adminLogin(ad);
await ad.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
await ad.fill('[data-testid=site-css]', '.pf-block h2 { letter-spacing: 7px; }\n</style><script>window.hacked=1</script>');

await ad.check('text=Show a loading screen');
await ad.selectOption('#loader-style', 'curtain');
await ad.click('button:has-text("Preview")');
await ad.waitForTimeout(600);
check('loader: the curtain preview plays', (await ad.locator('.site-loader').count()) === 1);
await ad.screenshot({ path: out + 'loader-curtain.png' });
for (const style of ['logo', 'spinner', 'dots', 'pulse', 'typing']) {
  await ad.selectOption('#loader-style', style);
  await ad.click('button:has-text("Preview")');
  await ad.waitForTimeout(700);
  check(`loader: the ${style} preview plays`, (await ad.locator('.site-loader').count()) === 1);
  await ad.locator('.site-loader').screenshot({ path: out + `loader-${style}.png` });
}
await ad.selectOption('#loader-style', 'dots');
await ad.check('text=Only on the first page of a visit').catch(() => undefined);

// The menu's link field lists the site's pages.
await ad.click('button:has-text("Add link")');
await ad.locator('[data-testid=link-pick]').last().click();
await ad.waitForSelector('[data-testid=link-options] button:has-text("CSS target")');
await ad.screenshot({ path: out + 'menu-link-picker.png' });
await ad.click('[data-testid=link-options] button:has-text("CSS target")');
check(
  'links: picking a page fills the menu link with its address',
  (await ad.locator('[data-testid=link-pick]').last().locator('xpath=../input').inputValue()) === enSlug,
);
await ad.locator('input[placeholder="English"]').last().fill('Styled');
await ad.click('button:has-text("Save settings")');
await ad.waitForSelector('text=Settings saved');

const settings = await api(token, 'GET', '/admin/settings');
check(
  'site css: stored without a way out of the style tag',
  !settings.customCss.includes('<') && settings.customCss.includes('letter-spacing: 7px'),
);
check('loader: the new style is stored', settings.loader.style === 'dots');

// ---------- Page editor: page CSS and the block link picker ----------
await ad.goto(`${BASE}/admin/pages/${target.id}`, { waitUntil: 'networkidle' });
await ad.click('button:has-text("Design")');
await ad.fill('[data-testid=page-css]', '.pf-text h2 { color: rgb(255, 0, 0); }');
await ad.click('button:has-text("Publish")');
await ad.waitForTimeout(1200);

// The Statement block's button link offers the site's pages too.
await ad.click('button:has-text("Layers")');
await ad.locator('aside span:text-is("Statement")').click();
await ad.waitForTimeout(300);
const picker = ad.locator('aside [data-testid=link-pick]').first();
if (await picker.count()) {
  await picker.click();
  await ad.waitForSelector('[data-testid=link-options] button:has-text("CSS target")');
  await ad.screenshot({ path: out + 'block-link-picker.png' });
  await ad.click('[data-testid=link-options] button:has-text("CSS target")');
  check(
    'links: picking a page in the editor uses its address in the language being edited',
    (await picker.locator('xpath=../input').inputValue()) === `/fa/${faSlug}`,
  );
} else {
  check('links: the selected block has a link field with a picker', false);
}

// ---------- Public site ----------
const pub = await browser.newPage({ viewport: { width: 1280, height: 800 } });
watch(pub);
await pub.goto(`${BASE}/en/${enSlug}`, { waitUntil: 'networkidle' });
await pub.waitForSelector('.site-loader', { state: 'detached', timeout: 10000 }).catch(() => null);
const h2 = pub.locator('.pf-text h2').first();
check('page css: applied on the published page', (await h2.evaluate((el) => getComputedStyle(el).color)) === 'rgb(255, 0, 0)');
check('site css: applied on every page', (await h2.evaluate((el) => getComputedStyle(el).letterSpacing)) === '7px');
check('site css: the injected script did not run', !(await pub.evaluate(() => window.hacked)));
await pub.screenshot({ path: out + 'public-page.png' });
await pub.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
check('page css: only on its own page', !(await pub.content()).includes('rgb(255, 0, 0)'));
check('menu: the picked page is linked', (await pub.locator(`header a[href="/en/${enSlug}"]`).count()) >= 1);

// ---------- No zoom when an input gets focus ----------
const viewport = await pub.locator('meta[name=viewport]').getAttribute('content');
check('inputs: the page cannot zoom in on focus', /maximum-scale=1/.test(viewport ?? ''), viewport);

// Leave the loader off for the other suites.
// Put the settings back for the other suites.
await api(token, 'PUT', '/admin/settings', { loader: before.loader, customCss: '', menu: before.menu });
await api(token, 'DELETE', `/admin/pages/${target.id}`);

await browser.close();
finish();
