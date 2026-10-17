import type { BlockDef, FieldDef, FieldOption } from './types.js';

/**
 * The playful look of undplus.com, a spatial design studio: giant heavy letters, a sunny main color on black and
 * white, cut-out shapes (starbursts, flowers, octagons) spinning in and between the words, and bands of text gliding
 * past. They take their colors from the theme (the "Spatial Yellow" theme matches the original).
 */

/** The cut-out shapes the blocks can draw, in the order the editor lists them. */
export const spatialShapes: FieldOption[] = [
  { value: 'burst', label: 'Starburst' },
  { value: 'sun', label: 'Sun rays' },
  { value: 'flower', label: 'Flower' },
  { value: 'octagon', label: 'Octagon' },
  { value: 'scallop', label: 'Scalloped circle' },
  { value: 'clover', label: 'Four petals' },
  { value: 'spark', label: 'Spark' },
];

const shape = (key = 'shape', label = 'Shape', none = false): FieldDef => ({
  key,
  label,
  type: 'select',
  options: none ? [...spatialShapes, { value: 'none', label: 'None' }] : spatialShapes,
});

const link = (label = 'Link'): FieldDef => ({ key: 'link', label, type: 'url' });

/** Profile networks with an icon of their own. */
export const spatialNetworks: FieldOption[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const look = (options: string[] = ['dark', 'accent', 'light']): FieldDef => ({
  key: 'look',
  label: 'Colors',
  type: 'select',
  options: options.map((value) => ({
    value,
    label: { dark: 'Dark', accent: 'Main color', second: 'Second color', light: 'Light' }[value] ?? value,
  })),
});

export const spatialDefinitions: BlockDef[] = [
  {
    type: 'letter-hero',
    label: 'Giant letters hero',
    icon: 'mdi-format-size',
    category: 'spatial',
    description:
      'A first screen filled by one huge word in the main color gliding sideways, with a line of text whose last words type themselves and change.',
    fields: [
      { key: 'word', label: 'Giant word', type: 'text', help: 'Usually the name; it glides across the whole screen.' },
      { key: 'lead', label: 'Text before the changing words', type: 'text' },
      {
        key: 'words',
        label: 'Changing words',
        type: 'list',
        itemLabel: 'text',
        max: 6,
        fields: [{ key: 'text', label: 'Words', type: 'text' }],
        help: 'Typed one after another after the text.',
      },
      { key: 'seconds', label: 'Seconds per glide of the word', type: 'number' },
      look(['dark', 'light', 'accent']),
    ],
    defaults: {
      word: 'STUDIO',
      lead: 'Studio for',
      words: [{ text: 'outstanding spatial design' }, { text: 'architecture with a twist' }, { text: 'spaces people remember' }],
      seconds: 18,
      look: 'dark',
    },
  },
  {
    type: 'picture-words',
    label: 'Words with pictures',
    icon: 'mdi-image-text',
    category: 'spatial',
    description:
      'Big centered lines rising in one by one, with a small picture or a spinning shape set in between the words like a letter.',
    fields: [
      {
        key: 'lines',
        label: 'Lines',
        type: 'list',
        itemLabel: 'before',
        max: 6,
        fields: [
          { key: 'before', label: 'Words before', type: 'text' },
          {
            key: 'media',
            label: 'In between',
            type: 'select',
            options: [
              { value: 'none', label: 'Nothing' },
              { value: 'shape', label: 'A spinning shape' },
              { value: 'image', label: 'A picture' },
            ],
          },
          shape(),
          { key: 'image', label: 'Picture', type: 'image' },
          { key: 'after', label: 'Words after', type: 'text' },
        ],
      },
    ],
    defaults: {
      lines: [
        { before: 'From concept to execution.', media: 'none', shape: 'sun', image: '', after: '' },
        { before: 'Ideas', media: 'shape', shape: 'sun', image: '', after: 'become spaces.' },
        { before: 'Spaces become', media: 'image', shape: 'burst', image: '', after: 'experiences.' },
      ],
    },
  },
  {
    type: 'shape-parade',
    label: 'Shape parade',
    icon: 'mdi-shape-outline',
    category: 'spatial',
    description:
      'A dark panel with a huge title, then a row of colorful cut-out shapes turning slowly and drifting sideways as you scroll, and a short text.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'shapes',
        label: 'Shapes',
        type: 'list',
        itemLabel: 'shape',
        max: 10,
        fields: [shape(), { key: 'color', label: 'Color', type: 'color', help: 'Empty: the theme’s main and second colors in turn.' }],
      },
      { key: 'text', label: 'Text', type: 'textarea' },
      look(['dark', 'light']),
    ],
    defaults: {
      title: '360° FULL SERVICE',
      subtitle: 'or just the degree you need.',
      shapes: [
        { shape: 'sun', color: '#7a5c94' },
        { shape: 'octagon', color: '#9a8232' },
        { shape: 'burst', color: '#7a5c94' },
        { shape: 'clover', color: '#9a8232' },
        { shape: 'scallop', color: '#7a5c94' },
        { shape: 'flower', color: '#9a8232' },
      ],
      text: 'From the first spark to the finishing touches, we shape our process around your vision.',
      look: 'dark',
    },
  },
  {
    type: 'focus-list',
    label: 'Centered list in focus',
    icon: 'mdi-format-align-center',
    category: 'spatial',
    description:
      'Big centered names (services, places…) between two small labels; the one in the middle of the screen is sharp and the others fade.',
    fields: [
      { key: 'label', label: 'Small label', type: 'text', help: 'Shown above and below the list.' },
      {
        key: 'items',
        label: 'Names',
        type: 'list',
        itemLabel: 'title',
        max: 14,
        fields: [{ key: 'title', label: 'Name', type: 'text' }, link()],
      },
    ],
    defaults: {
      label: 'Services',
      items: [
        { title: 'Brand Architecture', link: '' },
        { title: 'Event & Brand Experiences', link: '' },
        { title: 'Interior & Spatial Design', link: '' },
        { title: 'Retail & Hospitality', link: '' },
        { title: 'Workplace & New Work', link: '' },
        { title: 'Brand & Product Activations', link: '' },
        { title: 'Strategy & Consulting', link: '' },
      ],
    },
  },
  {
    type: 'ticker-band',
    label: 'Ticker band',
    icon: 'mdi-ticket-confirmation-outline',
    category: 'spatial',
    description:
      'A slim colored band of logos, profile links or a sentence gliding past endlessly, with small shapes or icons between them.',
    fields: [
      {
        key: 'items',
        label: 'Items',
        type: 'list',
        itemLabel: 'label',
        max: 16,
        fields: [
          { key: 'label', label: 'Text', type: 'text' },
          { key: 'image', label: 'Or a logo', type: 'image', help: 'Shown in white on dark bands, in black on light ones.' },
          { key: 'icon', label: 'Icon', type: 'select', options: [{ value: '', label: 'None' }, ...spatialNetworks] },
          link(),
        ],
      },
      shape('separator', 'Between items', true),
      { key: 'seconds', label: 'Seconds per loop', type: 'number' },
      { key: 'reverse', label: 'Glide the other way', type: 'boolean' },
      look(['accent', 'second', 'dark', 'light']),
    ],
    defaults: {
      items: [
        { label: 'More Projects on Instagram', image: '', icon: 'instagram', link: 'https://www.instagram.com/' },
        { label: 'More Inspiration on TikTok', image: '', icon: 'tiktok', link: 'https://www.tiktok.com/' },
        { label: 'More Information on LinkedIn', image: '', icon: 'linkedin', link: 'https://www.linkedin.com/' },
      ],
      separator: 'none',
      seconds: 30,
      reverse: false,
      look: 'accent',
    },
  },
  {
    type: 'work-done',
    label: 'Projects under a big title',
    icon: 'mdi-image-album',
    category: 'spatial',
    description:
      'A huge title that stays in the middle of the screen while project pictures of different sizes scroll past it, ending in a spinning starburst button.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'projects',
        label: 'Projects',
        type: 'list',
        itemLabel: 'title',
        max: 12,
        fields: [
          { key: 'image', label: 'Picture', type: 'image' },
          { key: 'title', label: 'Name', type: 'text' },
          { key: 'tags', label: 'Kinds of work', type: 'textarea', help: 'One per line.' },
          {
            key: 'size',
            label: 'Size',
            type: 'select',
            options: [
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'wide', label: 'Full width' },
            ],
          },
          link(),
        ],
      },
      { key: 'buttonLabel', label: 'Button label', type: 'text' },
      { key: 'buttonLink', label: 'Button link', type: 'url' },
    ],
    defaults: {
      title: 'WORK DONE',
      projects: [
        { image: '', title: 'TRADE FAIR BOOTH', tags: 'Brand Architecture', size: 'medium', link: '' },
        { image: '', title: 'DOJO OFFICE', tags: 'Workplace & New Work\nInterior Design', size: 'small', link: '' },
        { image: '', title: 'CORNER CAFÉ', tags: 'Retail & Hospitality\nInterior Design', size: 'wide', link: '' },
        { image: '', title: 'AWARDS NIGHT', tags: 'Event & Brand Experiences', size: 'small', link: '' },
        { image: '', title: 'BRAND BUS', tags: 'Brand and Product Activations', size: 'medium', link: '' },
      ],
      buttonLabel: 'More projects',
      buttonLink: '',
    },
  },
  {
    type: 'lit-paragraph',
    label: 'Paragraph lighting up',
    icon: 'mdi-text-long',
    category: 'spatial',
    description:
      'One big paragraph on a dark panel, its first line pushed in, lighting up word by word as you scroll and ending with a link in the main color.',
    fields: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'linkLabel', label: 'Link words', type: 'text' },
      { key: 'linkAfter', label: 'Words after the link', type: 'text' },
      { key: 'link', label: 'Link', type: 'url' },
      look(['dark', 'light']),
    ],
    defaults: {
      text: 'At our studio, we design spaces where brands take shape in the real world. From workplaces and retail to exhibitions, pop-ups and live events, we create places people remember. Curious who we are?',
      linkLabel: 'Learn more',
      linkAfter: 'about us.',
      link: '',
      look: 'dark',
    },
  },
  {
    type: 'wave-cta',
    label: 'Wavy call to action',
    icon: 'mdi-wave',
    category: 'spatial',
    description:
      'Giant chunky words in the main color, one letter swapped for a spinning shape, letters hopping when pointed at, and a wavy bottom edge.',
    fields: [
      { key: 'title', label: 'Words', type: 'text', help: 'A long one breaks onto two lines.' },
      {
        key: 'letter',
        label: 'Letter to swap for the shape',
        type: 'text',
        help: 'Its first appearance in the words, e.g. O. Leave empty to keep every letter.',
      },
      shape(),
      { key: 'link', label: 'Link', type: 'url' },
      { key: 'wave', label: 'Wavy bottom edge', type: 'boolean' },
      look(['accent', 'second', 'dark']),
    ],
    defaults: {
      title: 'GET IN TOUCH',
      letter: 'O',
      shape: 'sun',
      link: '#contact',
      wave: true,
      look: 'accent',
    },
  },
  {
    type: 'pill-footer',
    label: 'Pill label footer',
    icon: 'mdi-page-layout-footer',
    category: 'spatial',
    description: 'A black footer: a pill-shaped label over underlined links, big profile icons, the name, the cities and the copyright.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      {
        key: 'links',
        label: 'Links',
        type: 'list',
        itemLabel: 'label',
        max: 10,
        fields: [{ key: 'label', label: 'Text', type: 'text' }, link()],
      },
      {
        key: 'social',
        label: 'Profiles',
        type: 'list',
        itemLabel: 'network',
        max: 8,
        fields: [{ key: 'network', label: 'Network', type: 'select', options: spatialNetworks }, link()],
      },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'place', label: 'Cities', type: 'text' },
      { key: 'copyright', label: 'Copyright', type: 'text' },
    ],
    defaults: {
      label: 'Links',
      links: [
        { label: 'Contact', link: '#contact' },
        { label: 'Jobs', link: '' },
        { label: 'Imprint', link: '' },
        { label: 'Privacy Policy', link: '' },
      ],
      social: [
        { network: 'tiktok', link: 'https://www.tiktok.com/' },
        { network: 'instagram', link: 'https://www.instagram.com/' },
        { network: 'linkedin', link: 'https://www.linkedin.com/' },
      ],
      name: 'STUDIO',
      place: 'Berlin – Munich',
      copyright: '© Studio',
    },
  },
];
