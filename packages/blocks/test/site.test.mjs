import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanCss,
  cleanCustomHtml,
  cleanHeader,
  cleanLoader,
  customHtmlHasScript,
  loaderStyles,
  MAX_CUSTOM_CSS,
  MAX_CUSTOM_HTML,
} from '../dist/esm/index.js';

test('cleanCss keeps ordinary CSS as it is', () => {
  const css = '.site h1 > a { color: red; }\n@media (min-width: 40em) { .pf-block { margin: 0 } }';
  assert.equal(cleanCss(css), css);
});

test('cleanCss cannot close the style tag', () => {
  const out = cleanCss('a{}</style><script>alert(1)</script>');
  assert.ok(!out.includes('<'));
  assert.equal(out, 'a{}\\3c /style>\\3c script>alert(1)\\3c /script>');
  // Cleaning twice changes nothing (the site cleans again when it renders).
  assert.equal(cleanCss(out), out);
});

test('cleanCss drops anything that is not text and limits the length', () => {
  assert.equal(cleanCss(undefined), '');
  assert.equal(cleanCss({ a: 1 }), '');
  assert.equal(cleanCss('a'.repeat(MAX_CUSTOM_CSS + 10)).length, MAX_CUSTOM_CSS);
});

test('cleanLoader accepts every loader style and falls back to the counter', () => {
  for (const style of loaderStyles) assert.equal(cleanLoader({ style }).style, style);
  assert.equal(cleanLoader({ style: 'nope' }).style, 'percent');
});

test('cleanHeader keeps a button label per language and a safe link only', () => {
  assert.deepEqual(cleanHeader({ ctaLabel: { en: '  Get in touch ', fa: 'تماس', xx1: 'no', de: 3 }, ctaLink: '#contact', overlay: true }), {
    ctaLabel: { en: 'Get in touch', fa: 'تماس' },
    ctaLink: '#contact',
    overlay: true,
    place: {},
    timeZone: '',
  });
  assert.equal(cleanHeader({ ctaLink: 'javascript:alert(1)' }).ctaLink, '');
  assert.equal(cleanHeader({ ctaLink: 'contact' }).ctaLink, 'contact');
  assert.equal(cleanHeader({ ctaLabel: { en: 'x'.repeat(100) } }).ctaLabel.en.length, 40);
  assert.deepEqual(cleanHeader('nope'), { ctaLabel: {}, ctaLink: '', overlay: false, place: {}, timeZone: '' });
});

test('cleanHeader keeps the place per language and a time zone name only', () => {
  const h = cleanHeader({ place: { en: ' Manchester, UK ', fa: 'تهران', x: 'no' }, timeZone: 'Europe/London' });
  assert.deepEqual(h.place, { en: 'Manchester, UK', fa: 'تهران' });
  assert.equal(h.timeZone, 'Europe/London');
  for (const zone of ['UTC', 'America/Argentina/Buenos_Aires', 'Etc/GMT+3']) assert.equal(cleanHeader({ timeZone: zone }).timeZone, zone);
  for (const zone of ['</script>', 'Europe/London; x', '../../etc', 3]) assert.equal(cleanHeader({ timeZone: zone }).timeZone, '');
});

test('cleanCustomHtml keeps the HTML as it is, trimmed and limited in length', () => {
  const html = '<meta name="x" content="1">\n<script async src="https://example.com/a.js"></script>';
  assert.equal(cleanCustomHtml(`  ${html}\n`), html);
  assert.equal(cleanCustomHtml(42), '');
  assert.equal(cleanCustomHtml('a'.repeat(MAX_CUSTOM_HTML + 10)).length, MAX_CUSTOM_HTML);
  assert.equal(customHtmlHasScript(html), true);
  assert.equal(customHtmlHasScript('<SCRIPT>x()</SCRIPT>'), true);
  assert.equal(customHtmlHasScript('<meta name="scripted">'), false);
  assert.equal(customHtmlHasScript(undefined), false);
});
