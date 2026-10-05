import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocks, createBlock, validateBlocks, themeToCss } from '../dist/esm/index.js';

test('every block default passes validation', () => {
  const page = blocks.map((b) => createBlock(b.type));
  assert.deepEqual(validateBlocks(page), []);
});

test('rejects unknown types, unknown fields and duplicate ids', () => {
  const errors = validateBlocks([
    { id: 'a', type: 'nope', props: {} },
    { id: 'b', type: 'text', props: { title: 'x', evil: 1 } },
    { id: 'b', type: 'text', props: {} },
  ]);
  const paths = errors.map((e) => e.path);
  assert.ok(paths.includes('blocks[0].type'));
  assert.ok(paths.includes('blocks[1].props.evil'));
  assert.ok(paths.includes('blocks[2].id'));
});

test('rejects javascript: links and bad select values', () => {
  const errors = validateBlocks([
    { id: 'a', type: 'statement', props: { buttonLink: 'javascript:alert(1)' } },
    { id: 'b', type: 'card-grid', props: { columns: '9' } },
  ]);
  assert.equal(errors.length, 2);
});

test('validates list items recursively', () => {
  const errors = validateBlocks([
    { id: 'a', type: 'faq', props: { items: [{ q: 'ok', a: 5 }] } },
  ]);
  assert.deepEqual(errors.map((e) => e.path), ['blocks[0].props.items[0].a']);
});

test('theme tokens cannot break out of the style declaration', () => {
  const css = themeToCss({ primary: 'red;}body{display:none' });
  assert.ok(!css.includes('}'));
  assert.ok(css.includes('--c-primary:redbodydisplay:none'));
});

test('collection field definitions: keys, reserved names and galleries', async () => {
  const { validateFieldDefs, cleanFieldDef, galleryItemFields } = await import('../dist/esm/index.js');
  const ok = [
    { key: 'client', label: 'Client', type: 'text' },
    cleanFieldDef({ key: 'gallery', label: 'Gallery', type: 'list' }),
  ];
  assert.deepEqual(validateFieldDefs(ok), []);
  assert.deepEqual(ok[1].fields, galleryItemFields);

  const bad = validateFieldDefs([
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'Bad Key', label: 'x', type: 'text' },
    { key: 'a', label: 'A', type: 'collection' },
    { key: 'b', label: 'B', type: 'list', fields: [{ key: 'x', label: 'X', type: 'text' }] },
  ]);
  assert.deepEqual(bad.map((e) => e.path), ['fields[0].key', 'fields[1].key', 'fields[2].type', 'fields[3].fields']);
});

test('validateFields checks item data against a collection schema', async () => {
  const { validateFields, cleanFieldDef } = await import('../dist/esm/index.js');
  const fields = [{ key: 'year', label: 'Year', type: 'number' }, cleanFieldDef({ key: 'gallery', label: 'G', type: 'list' })];
  assert.deepEqual(validateFields(fields, { year: 2024, gallery: [{ image: '/uploads/a.jpg', caption: 'x' }] }), []);
  const errors = validateFields(fields, { year: '2024', gallery: [{ image: 'javascript:x' }], other: 1 });
  assert.deepEqual(errors.map((e) => e.path).sort(), ['data.gallery[0].image', 'data.other', 'data.year']);
});

test('video links: only YouTube and Aparat are embedded', async () => {
  const { videoEmbedUrl } = await import('../dist/esm/index.js');
  assert.equal(videoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=3'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoEmbedUrl('https://www.youtube.com/shorts/abcDEF12345'), 'https://www.youtube-nocookie.com/embed/abcDEF12345');
  assert.equal(videoEmbedUrl('https://www.aparat.com/v/x7Yz9'), 'https://www.aparat.com/video/video/embed/videohash/x7Yz9/vt/frame');
  assert.equal(videoEmbedUrl('https://evil.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(videoEmbedUrl('javascript:alert(1)'), null);
  assert.equal(videoEmbedUrl('https://youtube.com/watch?v=<script>'), null);
});

test('link safety: relative links and page addresses pass, hidden schemes do not', async () => {
  const { isSafeUrl } = await import('../dist/esm/index.js');
  for (const ok of ['', '/about', '#contact', 'contact', 'پروژه‌ها/مورد', 'https://example.com', 'mailto:a@b.co', 'tel:+98']) {
    assert.equal(isSafeUrl(ok), true, ok);
  }
  for (const bad of ['javascript:alert(1)', 'JavaScript:x', 'java\tscript:x', ' \njavascript:x', 'data:text/html,x', 'vbscript:x']) {
    assert.equal(isSafeUrl(bad), false, JSON.stringify(bad));
  }
});

test('themes: presets are clean, unknown values are dropped, page overrides win', async () => {
  const { themePresets, cleanTheme, resolveTheme, themeFontsHref, defaultTheme } = await import('../dist/esm/index.js');
  for (const p of themePresets) assert.deepEqual(cleanTheme(p.theme), p.theme, p.key);
  assert.deepEqual(cleanTheme({ primary: 'red;}', radius: '99rem', fontEn: 'Comic Sans', headerStyle: 'neon', evil: '#fff' }), {});
  const t = resolveTheme({ primary: '#111111', fontEn: 'Manrope' }, { primary: '#222222' });
  assert.equal(t.primary, '#222222');
  assert.equal(t.fontEn, 'Manrope');
  assert.equal(t.background, defaultTheme.background);
  assert.equal(
    themeFontsHref({ fontFa: 'Vazirmatn', fontEn: 'Playfair Display' }),
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&family=Playfair+Display:wght@400..900&display=swap',
  );
});

test('minicms kinds: all 12 are registered, and rich text is cleaned inside blocks and lists', async () => {
  const { classicDefinitions, mapRichText, formBlockTypes } = await import('../dist/esm/index.js');
  assert.equal(classicDefinitions.length, 12);
  assert.ok(classicDefinitions.every((d) => blocks.some((b) => b.type === d.type)));
  assert.ok(formBlockTypes.includes('contact-split'));

  const page = [createBlock('rich-text'), createBlock('text')];
  page[0].props.html = '<p onclick="x()">Hi</p><script>bad()</script>';
  const cleaned = mapRichText(page, (html) => html.replace(/<script.*?<\/script>/g, '').replace(/ on\w+="[^"]*"/g, ''));
  assert.equal(cleaned[0].props.html, '<p>Hi</p>');
  assert.equal(cleaned[1].props.body, page[1].props.body);
  assert.notEqual(cleaned[0], page[0], 'returns new objects instead of changing the input');
});
