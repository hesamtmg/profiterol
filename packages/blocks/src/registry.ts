import type { BlockDef, BlockNode, FieldDef } from './types.js';
import { animatedDefinitions, entranceAnimations } from './animated.js';
import { classicDefinitions, formFieldsField } from './classic.js';
import { extraDefinitions } from './extras.js';

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
    type: 'spotlight',
    label: 'Spotlight hero',
    icon: 'mdi-account-switch-outline',
    category: 'hero',
    description:
      'A full-screen photo of one person or brand, with the others as tall cards at the side. Clicking a card switches to it (the amsr-portfolio first screen).',
    fields: [
      {
        key: 'people',
        label: 'People',
        type: 'list',
        itemLabel: 'name',
        max: 4,
        fields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'photo', label: 'Background photo', type: 'image' },
          { key: 'mobilePhoto', label: 'Background photo on phones', type: 'image', help: 'Optional; a portrait crop looks best.' },
          { key: 'cardPhoto', label: 'Side card photo (cut-out)', type: 'image' },
          {
            key: 'cardLogo',
            label: 'Side card logo (vertical)',
            type: 'image',
            help: 'Optional; the name is written vertically if empty.',
          },
          { key: 'color', label: 'Color', type: 'color' },
          ...button,
        ],
      },
      { key: 'marquee', label: 'Moving text at the bottom', type: 'text' },
      {
        key: 'textSide',
        label: 'Text position',
        type: 'select',
        options: [
          { value: 'left', label: 'Text left, cards right' },
          { value: 'right', label: 'Text right, cards left' },
        ],
        help: 'Kept the same in every language, so it matches how the photos are composed.',
      },
      { key: 'scrollHint', label: 'Show the scroll hint', type: 'boolean' },
    ],
    defaults: {
      people: [
        {
          name: 'Design studio',
          headline: 'Websites and brands',
          text: 'A short line about the first person or brand. Click the card at the side to switch.',
          photo: '',
          mobilePhoto: '',
          cardPhoto: '',
          cardLogo: '',
          color: '#00a998',
          buttonLabel: 'Contact us',
          buttonLink: '#contact',
        },
        {
          name: 'Content team',
          headline: 'Words and pictures',
          text: 'A short line about the second person or brand.',
          photo: '',
          mobilePhoto: '',
          cardPhoto: '',
          cardLogo: '',
          color: '#c49a6c',
          buttonLabel: 'Contact us',
          buttonLink: '#contact',
        },
      ],
      marquee: 'SUPER FAST IS OUR KEY POWER',
      textSide: 'left',
      scrollHint: true,
    },
  },
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
      {
        key: 'buttonLabel',
        label: '“See all” button label',
        type: 'text',
        help: 'Links to the collection’s own page. Leave empty to hide.',
      },
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
      { key: 'fixedImage', label: 'Fixed background (parallax)', type: 'boolean' },
      ...button,
    ],
    defaults: {
      fixedImage: false,
      title: 'Speed is our key power',
      text: 'A sentence that sums up why people should choose you.',
      image: '',
      buttonLabel: 'Get in touch',
      buttonLink: '#contact',
    },
  },
  {
    type: 'video-hero',
    label: 'Video hero',
    icon: 'mdi-movie-open-outline',
    category: 'hero',
    description: 'A full-width muted video playing in the background, with a title and a button.',
    fields: [
      { key: 'video', label: 'Video (MP4 or WebM)', type: 'video' },
      { key: 'poster', label: 'Image shown while loading', type: 'image' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      ...button,
      {
        key: 'height',
        label: 'Height',
        type: 'select',
        options: [
          { value: 'tall', label: 'Tall' },
          { value: 'medium', label: 'Medium' },
        ],
      },
    ],
    defaults: {
      video: '',
      poster: '',
      title: 'Watch what we do',
      text: 'A short line that sits on top of your video.',
      buttonLabel: 'See our work',
      buttonLink: '#projects',
      height: 'tall',
    },
  },
  {
    type: 'carousel',
    label: 'Carousel',
    icon: 'mdi-view-carousel-outline',
    category: 'media',
    description: 'Slides with a photo, a heading and a button. Swipe, use the arrows, or let it play.',
    fields: [
      {
        key: 'slides',
        label: 'Slides',
        type: 'list',
        itemLabel: 'title',
        max: 12,
        fields: [
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          ...button,
        ],
      },
      { key: 'autoplay', label: 'Play automatically', type: 'boolean' },
      { key: 'seconds', label: 'Seconds per slide', type: 'number' },
    ],
    defaults: {
      slides: [
        { image: '', title: 'First slide', text: 'Add a photo and a few words.', buttonLabel: '', buttonLink: '' },
        { image: '', title: 'Second slide', text: 'Slides change by themselves or with the arrows.', buttonLabel: '', buttonLink: '' },
        { image: '', title: 'Third slide', text: 'On phones, swipe to move between them.', buttonLabel: '', buttonLink: '' },
      ],
      autoplay: true,
      seconds: 6,
    },
  },
  {
    type: 'gallery',
    label: 'Gallery',
    icon: 'mdi-image-multiple-outline',
    category: 'media',
    description: 'A grid of photos that open full screen when clicked.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        options: [
          { value: 'grid', label: 'Even grid' },
          { value: 'masonry', label: 'Masonry (keeps each photo’s shape)' },
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
      {
        key: 'images',
        label: 'Photos',
        type: 'list',
        itemLabel: 'caption',
        max: 60,
        fields: [
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'caption', label: 'Caption', type: 'text' },
        ],
      },
    ],
    defaults: {
      title: 'Gallery',
      layout: 'grid',
      columns: '3',
      images: [],
    },
  },
  {
    type: 'video',
    label: 'Video player',
    icon: 'mdi-play-box-outline',
    category: 'media',
    description: 'An uploaded video, or a YouTube or Aparat link.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'video', label: 'Uploaded video', type: 'video' },
      { key: 'link', label: 'Or a YouTube / Aparat link', type: 'url' },
      { key: 'poster', label: 'Cover image (uploaded videos)', type: 'image' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ],
    defaults: { title: '', video: '', link: '', poster: '', caption: '' },
  },
  {
    type: 'contact-form',
    label: 'Contact form',
    icon: 'mdi-form-select',
    category: 'contact',
    description: 'A form visitors fill in. Messages arrive in the admin inbox and can be emailed to you.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      formFieldsField,
      { key: 'submitLabel', label: 'Button label', type: 'text' },
      { key: 'successMessage', label: 'Message after sending', type: 'textarea' },
    ],
    defaults: {
      title: 'Send us a message',
      text: 'We usually reply within one working day.',
      fields: [
        { label: 'Name', type: 'text', required: true, options: '', placeholder: '' },
        { label: 'Email', type: 'email', required: true, options: '', placeholder: '' },
        { label: 'Phone', type: 'tel', required: false, options: '', placeholder: '' },
        { label: 'Message', type: 'textarea', required: true, options: '', placeholder: '' },
      ],
      submitLabel: 'Send',
      successMessage: 'Thank you! We received your message.',
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
  ...extraDefinitions,
  ...animatedDefinitions,
  ...classicDefinitions,
];

/** Every block can play an entrance animation when it scrolls into view. */
const animationField: FieldDef = {
  key: 'animation',
  label: 'Entrance animation',
  type: 'select',
  options: entranceAnimations,
};

/** Every block can be given an anchor so menu links like `#services` can scroll to it. */
const anchorField: FieldDef = {
  key: 'anchor',
  label: 'Anchor (for #links)',
  type: 'text',
  help: 'Letters, digits and dashes, e.g. services',
};

/** Every block can be limited to small or large screens. */
const showOnField: FieldDef = {
  key: 'showOn',
  label: 'Show on',
  type: 'select',
  options: [
    { value: '', label: 'All devices' },
    { value: 'mobile', label: 'Phones only' },
    { value: 'desktop', label: 'Tablets and desktops only' },
  ],
};

export const blocks: BlockDef[] = definitions.map((b) => ({
  ...b,
  fields: [...b.fields, animationField, anchorField, showOnField],
  defaults: { animation: '', anchor: '', showOn: '', ...b.defaults },
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
