import type { BlockDef, FieldDef } from './types.js';

/** The most columns a Columns block can have. */
export const MAX_COLUMNS = 4;

/** Blocks that hold other blocks. They cannot be put inside each other (one level of nesting). */
export const layoutDefinitions: BlockDef[] = [
  {
    type: 'columns',
    label: 'Columns',
    icon: 'mdi-view-column-outline',
    category: 'layout',
    description: 'Two to four columns side by side; drop any content blocks into each. They stack on small screens.',
    fields: [
      {
        key: 'count',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ],
        help: 'With fewer columns, the blocks of the removed ones move into the last column.',
      },
      {
        key: 'ratio',
        label: 'Widths',
        type: 'select',
        options: [
          { value: 'equal', label: 'Equal' },
          { value: 'wide-start', label: 'First one wider (2 : 1)' },
          { value: 'wide-end', label: 'Last one wider (1 : 2)' },
        ],
        help: 'Wider columns apply to two columns.',
      },
      {
        key: 'gap',
        label: 'Space between',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      {
        key: 'valign',
        label: 'Line up',
        type: 'select',
        options: [
          { value: 'start', label: 'At the top' },
          { value: 'center', label: 'In the middle' },
          { value: 'end', label: 'At the bottom' },
        ],
      },
      {
        key: 'stack',
        label: 'Stack below',
        type: 'select',
        options: [
          { value: 'phone', label: 'Phone width' },
          { value: 'tablet', label: 'Tablet width' },
        ],
      },
    ],
    defaults: { count: '2', ratio: 'equal', gap: 'md', valign: 'start', stack: 'phone' },
    slots: (props) => Math.min(Math.max(Number(props.count) || 2, 2), MAX_COLUMNS),
  },
  {
    type: 'group',
    label: 'Group',
    icon: 'mdi-group',
    category: 'layout',
    description: 'Several blocks that share one background, spacing and width, and move together.',
    fields: [],
    defaults: {},
    slots: () => 1,
  },
];

export const layoutBlockTypes = layoutDefinitions.map((d) => d.type);

/** Full-screen blocks that only make sense directly on the page, not inside a column. */
export const topLevelOnlyTypes = [
  'spotlight',
  'hero-cards',
  'video-hero',
  'aurora-hero',
  'parallax',
  'sticky-story',
  'horizontal-scroll',
  'video-cover',
  'slider',
  ...layoutBlockTypes,
];

/** Extra space added around the block (its own design keeps its spacing). */
const spacing = [
  { value: '', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

/**
 * Style options every block has, shown together in the editor. Colors work like a small theme for the block:
 * they override the page's colors inside it, so the block's own design picks them up.
 */
export const styleFields: FieldDef[] = [
  { key: 'bgColor', label: 'Backdrop color', type: 'color', group: 'style', help: 'Behind the block, edge to edge.' },
  {
    key: 'bgImage',
    label: 'Backdrop picture',
    type: 'image',
    group: 'style',
    help: 'Covers the backdrop; its color shows while it loads.',
  },
  { key: 'panelColor', label: 'Panels and cards', type: 'color', group: 'style' },
  { key: 'textColor', label: 'Text', type: 'color', group: 'style' },
  { key: 'accentColor', label: 'Buttons and highlights', type: 'color', group: 'style' },
  { key: 'spaceTop', label: 'Extra space above', type: 'select', options: spacing, group: 'style' },
  { key: 'spaceBottom', label: 'Extra space below', type: 'select', options: spacing, group: 'style' },
  {
    key: 'maxWidth',
    label: 'Content width',
    type: 'select',
    options: [
      { value: '', label: 'As designed' },
      { value: 'wide', label: 'Wide (1280 px)' },
      { value: 'medium', label: 'Medium (960 px)' },
      { value: 'narrow', label: 'Narrow (720 px)' },
    ],
    group: 'style',
  },
];

export const styleDefaults = Object.fromEntries(styleFields.map((f) => [f.key, '']));

export const isTopLevelOnly = (type: string) => topLevelOnlyTypes.includes(type);
