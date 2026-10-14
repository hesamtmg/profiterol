import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlock,
  getBlock,
  mapRichText,
  registerCustomBlocks,
  reservedFieldKeys,
  validateBlockDef,
  validateBlocks,
  withCommonFields,
  withDefaults,
} from '../dist/esm/index.js';

const def = {
  label: 'Price cards',
  icon: 'mdi-cash',
  description: 'Plans side by side',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'row', label: 'Row' },
        { value: 'grid', label: 'Grid' },
      ],
    },
    { key: 'plans', label: 'Plans', type: 'list', itemLabel: 'name', max: 4, fields: [{ key: 'name', label: 'Name', type: 'text' }] },
  ],
  defaults: { title: 'Pricing', layout: 'grid', plans: [{ name: 'Basic' }] },
};

test('a good definition passes, tidied, with the custom category', () => {
  const { def: clean, errors } = validateBlockDef({ ...def, extra: 'dropped' }, 'ai-price-cards-1a2b');
  assert.deepEqual(errors, []);
  assert.equal(clean.type, 'ai-price-cards-1a2b');
  assert.equal(clean.category, 'custom');
  assert.equal(clean.fields.length, 3);
  assert.equal('extra' in clean, false);
});

test('missing defaults are filled with empty values', () => {
  const { def: clean, errors } = validateBlockDef({ ...def, defaults: {} }, 'ai-x');
  assert.deepEqual(errors, []);
  assert.deepEqual(clean.defaults, { title: '', layout: 'row', plans: [] });
});

test('bad definitions are explained', () => {
  const messages = (input, type = 'ai-x') => validateBlockDef(input, type).errors.map((e) => `${e.path} ${e.message}`);
  assert.match(messages(def, 'hero')[0], /must start with "ai-"/);
  assert.ok(messages({ ...def, fields: [{ key: 'Bad Key', label: 'x', type: 'text' }] }).some((m) => m.includes('camelCase')));
  assert.ok(messages({ ...def, fields: [{ key: 'bgColor', label: 'x', type: 'color' }] }).some((m) => m.includes('shared field')));
  assert.ok(messages({ ...def, fields: [{ key: 'body', label: 'x', type: 'richtext' }] }).some((m) => m.includes('must be one of')));
  assert.ok(
    messages({
      ...def,
      fields: [
        { key: 'a', label: 'x', type: 'text' },
        { key: 'a', label: 'y', type: 'text' },
      ],
    }).some((m) => m.includes('used twice')),
  );
  assert.ok(
    messages({
      ...def,
      fields: [{ key: 'l', label: 'x', type: 'list', fields: [{ key: 'm', label: 'y', type: 'list', fields: [] }] }],
    }).some((m) => m.includes('list inside') || m.includes('cannot hold another list')),
  );
  assert.ok(messages({ ...def, defaults: { ...def.defaults, layout: 'diagonal' } }).some((m) => m.includes('allowed options')));
  assert.ok(messages({ ...def, defaults: { ...def.defaults, title: 5 } }).some((m) => m.includes('must be text')));
  assert.ok(reservedFieldKeys().includes('anchor'));
});

test('pages may use custom blocks passed as `extra`, with the shared style fields', () => {
  const custom = withCommonFields(validateBlockDef(def, 'ai-price-cards').def);
  const node = { id: 'a', type: 'ai-price-cards', props: { title: 'Plans', bgColor: '#ffffff' } };
  assert.deepEqual(validateBlocks([node], [custom]), []);
  assert.match(validateBlocks([node])[0].message, /unknown block type/, 'unknown without them');
  assert.equal(withDefaults(node, [custom]).layout, 'grid');
  assert.deepEqual(
    mapRichText([node], (h) => h, [custom]),
    [node],
  );
  assert.ok(validateBlocks([{ ...node, props: { nope: 1 } }], [custom]).some((e) => e.message === 'is not a known field'));
});

test('the editor registers custom blocks for getBlock and createBlock; built-in types win', () => {
  const custom = withCommonFields(validateBlockDef(def, 'ai-price-cards').def);
  registerCustomBlocks([custom]);
  try {
    assert.equal(getBlock('ai-price-cards')?.label, 'Price cards');
    assert.equal(createBlock('ai-price-cards').props.title, 'Pricing');
    assert.notEqual(getBlock('spotlight', [{ ...custom, type: 'spotlight' }])?.category, 'custom');
  } finally {
    registerCustomBlocks([]);
  }
  assert.equal(getBlock('ai-price-cards'), undefined);
});
