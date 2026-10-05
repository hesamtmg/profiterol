import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allBlocks,
  blocks,
  cloneBlock,
  createBlock,
  findBlock,
  getPageTemplate,
  mapRichText,
  pageTemplates,
  resizeColumns,
  siteTemplates,
  siteTemplateTheme,
  templateBlocks,
  themeToCss,
  validateBlocks,
} from '../dist/esm/index.js';

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
  const errors = validateBlocks([{ id: 'a', type: 'faq', props: { items: [{ q: 'ok', a: 5 }] } }]);
  assert.deepEqual(
    errors.map((e) => e.path),
    ['blocks[0].props.items[0].a'],
  );
});

test('theme tokens cannot break out of the style declaration', () => {
  const css = themeToCss({ primary: 'red;}body{display:none' });
  assert.ok(!css.includes('}'));
  assert.ok(css.includes('--c-primary:redbodydisplay:none'));
});

test('collection field definitions: keys, reserved names and galleries', async () => {
  const { validateFieldDefs, cleanFieldDef, galleryItemFields } = await import('../dist/esm/index.js');
  const ok = [{ key: 'client', label: 'Client', type: 'text' }, cleanFieldDef({ key: 'gallery', label: 'Gallery', type: 'list' })];
  assert.deepEqual(validateFieldDefs(ok), []);
  assert.deepEqual(ok[1].fields, galleryItemFields);

  const bad = validateFieldDefs([
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'Bad Key', label: 'x', type: 'text' },
    { key: 'a', label: 'A', type: 'collection' },
    { key: 'b', label: 'B', type: 'list', fields: [{ key: 'x', label: 'X', type: 'text' }] },
  ]);
  assert.deepEqual(
    bad.map((e) => e.path),
    ['fields[0].key', 'fields[1].key', 'fields[2].type', 'fields[3].fields'],
  );
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
  assert.deepEqual(
    cleanTheme({
      primary: 'red;}',
      radius: '99rem',
      fontEn: 'Comic Sans',
      headerStyle: 'neon',
      cursor: 'url(x)',
      pageTransition: 'spin',
      evil: '#fff',
    }),
    {},
  );
  assert.deepEqual(cleanTheme({ cursor: 'ring', pageTransition: 'curtain' }), { cursor: 'ring', pageTransition: 'curtain' });
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

test('animated blocks are registered, and every block can have an entrance animation', async () => {
  const { animatedDefinitions } = await import('../dist/esm/index.js');
  assert.equal(animatedDefinitions.length, 12);
  assert.ok(blocks.every((b) => b.fields.some((f) => f.key === 'animation') && b.defaults.animation === ''));
  const hero = createBlock('aurora-hero');
  hero.props.animation = 'zoom';
  assert.deepEqual(validateBlocks([hero]), []);
  hero.props.animation = 'spin-forever';
  assert.equal(validateBlocks([hero])[0].path, 'blocks[0].props.animation');
});

test('site fonts, saved themes and loader settings are cleaned', async () => {
  const { cleanFonts, fontFaceCss, cleanSavedThemes, cleanLoader, cleanTheme, resolveTheme } = await import('../dist/esm/index.js');
  const fonts = cleanFonts([
    {
      name: 'Logotype',
      files: [
        { url: '/uploads/abc-1.woff2', weight: 730, style: 'italic' },
        { url: 'https://evil.example/x.woff2', weight: 400 },
      ],
    },
    { name: "Bad'}name", files: [{ url: '/uploads/a.woff2', weight: 400 }] },
    { name: 'NoFiles', files: [{ url: '/uploads/a.exe' }] },
    { name: 'لوگو تایپ', files: [{ url: '/uploads/b.ttf' }] },
  ]);
  assert.deepEqual(
    fonts.map((f) => f.name),
    ['Logotype', 'لوگو تایپ'],
  );
  assert.deepEqual(fonts[0].files, [{ url: '/uploads/abc-1.woff2', weight: 700, style: 'italic' }]);
  const css = fontFaceCss(fonts);
  assert.match(css, /font-family:'Logotype';src:url\('\/uploads\/abc-1.woff2'\) format\('woff2'\);font-weight:700;font-style:italic/);
  assert.match(css, /format\('truetype'\)/);
  // Custom fonts are accepted in themes only once uploaded.
  assert.equal(cleanTheme({ fontEn: 'Logotype' }).fontEn, undefined);
  assert.equal(cleanTheme({ fontEn: 'Logotype' }, ['Logotype']).fontEn, 'Logotype');
  assert.equal(resolveTheme({ fontFa: 'لوگو تایپ' }, null, ['لوگو تایپ']).fontFa, 'لوگو تایپ');
  const saved = cleanSavedThemes(
    [
      { key: 'mine-1', name: ' Mine ', theme: { primary: '#123456', fontEn: 'Logotype', evil: 'x' } },
      { key: 'mine-1', name: 'Duplicate', theme: {} },
      { key: 'BAD KEY', name: 'x', theme: {} },
    ],
    ['Logotype'],
  );
  assert.deepEqual(saved, [{ key: 'mine-1', name: 'Mine', theme: { primary: '#123456', fontEn: 'Logotype' } }]);
  assert.deepEqual(
    cleanLoader({ enabled: true, style: 'spin', text: { en: 'Hi', '<x>': 'no' }, background: 'javascript:x', oncePerSession: false }),
    {
      enabled: true,
      style: 'percent',
      text: { en: 'Hi' },
      background: '',
      oncePerSession: false,
    },
  );
});

test('pricing, map and spacer blocks are registered with valid defaults', () => {
  for (const type of ['pricing', 'map', 'spacer']) assert.deepEqual(validateBlocks([createBlock(type)]), [], type);
});

describe('columns and groups', () => {
  const text = (id, title = 'Hi') => ({ id, type: 'text', props: { title } });
  const columns = (children, props = { count: '2' }) => ({ id: 'cols', type: 'columns', props, children });

  test('blocks inside columns are validated like page blocks', () => {
    assert.deepEqual(validateBlocks([columns([[text('a')], [text('b')]])]), []);
    const errors = validateBlocks([columns([[text('a', 5)], []])]);
    assert.equal(errors[0].path, 'blocks[0].children[0][0].props.title');
  });

  test('the number of columns must match', () => {
    assert.match(validateBlocks([columns([[text('a')]])])[0].message, /2 list/);
    assert.deepEqual(validateBlocks([columns([[], [], []], { count: '3' })]), []);
  });

  test('full-screen blocks and layout blocks cannot be nested', () => {
    const hero = { id: 'h', type: 'spotlight', props: {} };
    assert.match(validateBlocks([columns([[hero], []])])[0].message, /cannot be placed inside/);
    const inner = { id: 'g', type: 'group', props: {}, children: [[]] };
    assert.match(validateBlocks([columns([[inner], []])])[0].message, /cannot be placed inside/);
  });

  test('only layout blocks hold children, and ids are unique across levels', () => {
    assert.match(validateBlocks([{ ...text('t'), children: [[]] }])[0].message, /only columns and groups/);
    assert.match(validateBlocks([text('a'), columns([[text('a')], []])])[0].message, /duplicated/);
  });

  test('createBlock gives layout blocks their empty columns', () => {
    assert.deepEqual(createBlock('columns').children, [[], []]);
    assert.deepEqual(createBlock('group').children, [[]]);
    assert.equal(createBlock('text').children, undefined);
  });

  test('tree helpers find, clone and resize', () => {
    const tree = [text('a'), columns([[text('b')], [text('c')]])];
    const place = findBlock(tree, 'c');
    assert.equal(place.parent.id, 'cols');
    assert.equal(place.index, 0);
    assert.deepEqual(
      allBlocks(tree).map((b) => b.id),
      ['a', 'cols', 'b', 'c'],
    );
    let n = 0;
    const copy = cloneBlock(tree[1], () => `x${n++}`);
    assert.deepEqual(
      allBlocks([copy]).map((b) => b.id),
      ['x0', 'x1', 'x2'],
    );
    assert.deepEqual(
      resizeColumns(tree[1], 1).map((c) => c.map((b) => b.id)),
      [['b', 'c']],
    );
    assert.deepEqual(
      resizeColumns(tree[1], 3).map((c) => c.length),
      [1, 1, 0],
    );
  });

  test('every block has the style fields, and colors are checked', () => {
    assert.deepEqual(validateBlocks([{ id: 's', type: 'text', props: { bgColor: '#123456', spaceTop: 'lg', maxWidth: 'narrow' } }]), []);
    assert.match(validateBlocks([{ id: 's', type: 'faq', props: { textColor: 'red' } }])[0].message, /hex color/);
  });

  test('rich text inside columns is cleaned too', () => {
    const tree = [columns([[{ id: 'r', type: 'rich-text', props: { html: '<p>x<script></script></p>' } }], []])];
    const cleaned = mapRichText(tree, (html) => html.replace(/<script><\/script>/g, ''));
    assert.equal(cleaned[0].children[0][0].props.html, '<p>x</p>');
  });
});

describe('templates', () => {
  test('every page template is valid in both languages', () => {
    for (const template of pageTemplates) {
      for (const locale of ['en', 'fa']) {
        assert.deepEqual(validateBlocks(templateBlocks(template.key, locale)), [], `${template.key} (${locale})`);
      }
    }
  });

  test('site templates use existing page templates and themes', () => {
    for (const site of siteTemplates) {
      assert.ok(siteTemplateTheme(site.key), `${site.key} theme`);
      for (const p of site.pages) assert.ok(getPageTemplate(p.template), `${site.key}: ${p.template}`);
    }
  });
});
