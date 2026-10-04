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
