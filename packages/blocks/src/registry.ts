import type { BlockDef, BlockNode, FieldDef } from './types.js';

const button: FieldDef[] = [
  { key: 'buttonLabel', label: 'Button label', type: 'text' },
  { key: 'buttonLink', label: 'Button link', type: 'url' },
];

/**
 * Every block the builder knows about. The API validates against these definitions,
 * the editor renders its property forms from `fields`, and the site renders each
 * `type` with the matching component, so a field is declared exactly once.
 */
const definitions: BlockDef[] = [
  {
    type: 'hero-cards',
    label: 'Expanding cards hero',
    icon: 'mdi-card-account-details-outline',
    category: 'hero',
    description: 'Side-by-side cards; the active one expands with a photo, the others fold into colored strips.',
    fields: [
      { key: 'marquee', label: 'Marquee text', type: 'text' },
      {
        key: 'cards',
        label: 'Cards',
        type: 'list',
        itemLabel: 'title',
        max: 4,
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'image', label: 'Background image', type: 'image' },
          { key: 'letter', label: 'Strip letter', type: 'text' },
          { key: 'color', label: 'Accent color', type: 'color' },
          ...button,
        ],
      },
    ],
    defaults: {
      marquee: 'BUILD YOUR SITE IN MINUTES',
      cards: [
        {
          title: 'First card',
          text: 'Describe the first person, product or service.',
          image: '',
          letter: 'A',
          color: '#00a998',
          buttonLabel: 'Learn more',
          buttonLink: '#',
        },
        {
          title: 'Second card',
          text: 'Describe the second person, product or service.',
          image: '',
          letter: 'B',
          color: '#c49a6c',
          buttonLabel: 'Learn more',
          buttonLink: '#',
        },
      ],
    },
  },
  {
    type: 'card-grid',
    label: 'Card grid',
    icon: 'mdi-view-grid-outline',
    category: 'cards',
    description: 'A rounded panel with a title and a grid of icon / title / text cards.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'columns',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ],
      },
      {
        key: 'variant',
        label: 'Card style',
        type: 'select',
        options: [
          { value: 'plain', label: 'Plain (icon + text)' },
          { value: 'raised', label: 'Raised cards with hover' },
          { value: 'photo', label: 'Photo cards' },
        ],
      },
      {
        key: 'items',
        label: 'Cards',
        type: 'list',
        itemLabel: 'title',
        fields: [
          { key: 'image', label: 'Icon / photo', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'link', label: 'Link', type: 'url' },
        ],
      },
    ],
    defaults: {
      title: 'Our services',
      subtitle: 'A short sentence about what you offer.',
      columns: '3',
      variant: 'raised',
      items: [
        { image: '', title: 'Service one', text: 'A short description of this service.', link: '' },
        { image: '', title: 'Service two', text: 'A short description of this service.', link: '' },
        { image: '', title: 'Service three', text: 'A short description of this service.', link: '' },
      ],
    },
  },
  {
    type: 'collection-list',
    label: 'Collection list',
    icon: 'mdi-view-dashboard-variant-outline',
    category: 'cards',
    description: 'Shows the latest published items of a collection (projects, blog posts…) as cards.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'collection', label: 'Collection', type: 'collection' },
      {
        key: 'variant',
        label: 'Card style',
        type: 'select',
        options: [
          { value: 'photo', label: 'Photo cards' },
          { value: 'raised', label: 'Raised cards with hover' },
          { value: 'plain', label: 'Plain (icon + text)' },
        ],
      },
      {
        key: 'columns',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ],
      },
      { key: 'limit', label: 'How many items', type: 'number' },
      { key: 'tag', label: 'Only items with this tag', type: 'text' },
      { key: 'showFilters', label: 'Show tag filters', type: 'boolean' },
      { key: 'buttonLabel', label: '“See all” button label', type: 'text', help: 'Links to the collection’s own page. Leave empty to hide.' },
    ],
    defaults: {
      title: 'Recent projects',
      subtitle: '',
      collection: 'projects',
      variant: 'photo',
      columns: '3',
      limit: 6,
      tag: '',
      showFilters: false,
      buttonLabel: 'See all',
    },
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'mdi-format-text',
    category: 'content',
    description: 'A heading with paragraphs. Separate paragraphs with a blank line.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      {
        key: 'align',
        label: 'Alignment',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'center', label: 'Center' },
        ],
      },
    ],
    defaults: {
      title: 'A heading',
      body: 'Write something here.\n\nA second paragraph.',
      align: 'start',
    },
  },
  {
    type: 'image-text',
    label: 'Image + text',
    icon: 'mdi-image-text',
    category: 'media',
    description: 'An image beside a heading, text and button.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      {
        key: 'imageSide',
        label: 'Image side',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'end', label: 'End' },
        ],
      },
      ...button,
    ],
    defaults: {
      title: 'Tell your story',
      text: 'Pair a photo with a few sentences about your work.',
      image: '',
      imageSide: 'start',
      buttonLabel: '',
      buttonLink: '',
    },
  },
  {
    type: 'statement',
    label: 'Statement',
    icon: 'mdi-format-quote-open',
    category: 'content',
    description: 'A full-width background image with a bold statement and a call to action.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'image', label: 'Background image', type: 'image' },
      ...button,
    ],
    defaults: {
      title: 'Speed is our key power',
      text: 'A sentence that sums up why people should choose you.',
      image: '',
      buttonLabel: 'Get in touch',
      buttonLink: '#contact',
    },
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: 'mdi-frequently-asked-questions',
    category: 'content',
    description: 'A two-column panel with an intro and an accordion of questions.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'items',
        label: 'Questions',
        type: 'list',
        itemLabel: 'q',
        fields: [
          { key: 'q', label: 'Question', type: 'text' },
          { key: 'a', label: 'Answer', type: 'textarea' },
        ],
      },
    ],
    defaults: {
      title: 'Frequently asked questions',
      subtitle: 'Answers to the things people ask most.',
      items: [
        { q: 'How long does it take?', a: 'Usually a few days.' },
        { q: 'How much does it cost?', a: 'It depends on the project.' },
      ],
    },
  },
  {
    type: 'marquee',
    label: 'Marquee',
    icon: 'mdi-arrow-left-right',
    category: 'content',
    description: 'Large, light text that scrolls across the screen.',
    fields: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'seconds', label: 'Seconds per loop', type: 'number' },
    ],
    defaults: { text: 'SUPER FAST IS OUR KEY POWER', seconds: 30 },
  },
  {
    type: 'contact-footer',
    label: 'Contact + footer',
    icon: 'mdi-email-outline',
    category: 'contact',
    description: 'A dark contact panel with details and the copyright line.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'copyright', label: 'Copyright', type: 'text' },
    ],
    defaults: {
      title: 'Let’s talk',
      text: 'Send us a message and we will get back to you.',
      email: 'hello@example.com',
      phone: '',
      address: '',
      copyright: '© Your company',
    },
  },
];

/** Every block can be given an anchor so menu links like `#services` can scroll to it. */
const anchorField: FieldDef = {
  key: 'anchor',
  label: 'Anchor (for #links)',
  type: 'text',
  help: 'Letters, digits and dashes, e.g. services',
};

export const blocks: BlockDef[] = definitions.map((b) => ({
  ...b,
  fields: [...b.fields, anchorField],
  defaults: { anchor: '', ...b.defaults },
}));

export function getBlock(type: string): BlockDef | undefined {
  return blocks.find((b) => b.type === type);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Creates a new block instance with a deep copy of its defaults. */
export function createBlock(type: string): BlockNode {
  const def = getBlock(type);
  if (!def) throw new Error(`Unknown block type "${type}"`);
  return { id: randomId(), type, props: JSON.parse(JSON.stringify(def.defaults)) };
}

/** Builds an empty item for a list field, using each sub-field's empty value. */
export function createListItem(field: FieldDef): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const f of field.fields ?? []) {
    if (f.type === 'number') item[f.key] = 0;
    else if (f.type === 'boolean') item[f.key] = false;
    else if (f.type === 'list') item[f.key] = [];
    else if (f.type === 'select') item[f.key] = f.options?.[0]?.value ?? '';
    else item[f.key] = '';
  }
  return item;
}
