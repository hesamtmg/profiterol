import type { BlockDef, FieldDef } from './types.js';

/**
 * The dark creative developer portfolio of mikewilcockdesign.com: near-black pages, huge condensed type, small
 * uppercase monospace labels in brackets and one soft blue for accents. They take their colors from the theme
 * (the "Folio Night" theme matches the original).
 */

const link = (label = 'Link'): FieldDef => ({ key: 'link', label, type: 'url' });

const look: FieldDef = {
  key: 'look',
  label: 'Colors',
  type: 'select',
  options: [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ],
};

const placeFields: FieldDef[] = [
  { key: 'city', label: 'City', type: 'text' },
  {
    key: 'timeZone',
    label: 'Time zone for the clock',
    type: 'text',
    help: 'e.g. Europe/London or Asia/Tehran; the local time is shown after the city. Leave empty for no clock.',
  },
];

export const folioDefinitions: BlockDef[] = [
  {
    type: 'name-hero',
    label: 'Split name hero',
    icon: 'mdi-format-letter-spacing-variant',
    category: 'folio',
    description:
      'A first screen with three small labels across the top, a huge name on two lines (the first at the start, the second at the end) rising in, a short text and a button.',
    fields: [
      { key: 'labelStart', label: 'Label at the start', type: 'text', help: 'e.g. (Portfolio / ©2026)' },
      { key: 'labelMiddle', label: 'Label in the middle', type: 'text' },
      { key: 'labelEnd', label: 'Label at the end', type: 'text' },
      { key: 'first', label: 'First line', type: 'text' },
      { key: 'second', label: 'Second line', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'hint', label: 'Scroll hint', type: 'text' },
      { key: 'buttonLabel', label: 'Button label', type: 'text' },
      { key: 'buttonLink', label: 'Button link', type: 'url' },
      look,
    ],
    defaults: {
      labelStart: '(Portfolio / ©2026)',
      labelMiddle: 'Creative developer',
      labelEnd: 'Manchester, UK',
      first: 'MIKE',
      second: 'WILCOCK',
      text: 'I design and build websites and apps with a lot of movement in them. Startups, small businesses and fellow studios, mostly.',
      hint: '↓ Scroll, gently',
      buttonLabel: 'See the work →',
      buttonLink: '#work',
      look: 'dark',
    },
  },
  {
    type: 'word-ticker',
    label: 'Italic word ticker',
    icon: 'mdi-format-italic',
    category: 'folio',
    description:
      'Big italic words between two thin lines, separated by small diamonds in the main color, sliding across the page; scrolling speeds them up.',
    fields: [
      {
        key: 'words',
        label: 'Words',
        type: 'list',
        itemLabel: 'text',
        max: 12,
        fields: [{ key: 'text', label: 'Text', type: 'text' }],
      },
      {
        key: 'speed',
        label: 'Speed',
        type: 'select',
        options: [
          { value: 'slow', label: 'Slow' },
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Fast' },
        ],
      },
      look,
    ],
    defaults: {
      words: ['Design', 'Build', 'Motion', 'Shopify', 'Webflow', 'Next.js', 'Apps'].map((text) => ({ text })),
      speed: 'normal',
      look: 'dark',
    },
  },
  {
    type: 'work-index',
    label: 'Work list with a sticky preview',
    icon: 'mdi-view-split-vertical',
    category: 'folio',
    description:
      'Numbered projects in big type down one side, each with its year, kind of work and a link; the picture of the one in the middle of the screen stays beside them, with a counter and a progress line.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'period', label: 'Years', type: 'text', help: 'e.g. 2024 — 2026' },
      {
        key: 'projects',
        label: 'Projects',
        type: 'list',
        itemLabel: 'title',
        max: 12,
        fields: [
          { key: 'title', label: 'Name', type: 'text' },
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'kind', label: 'Kind of work', type: 'text' },
          { key: 'note', label: 'Note in the main color', type: 'text' },
          { key: 'tag', label: 'Short tag under the picture', type: 'text' },
          { key: 'image', label: 'Picture', type: 'image' },
          { key: 'color', label: 'Background behind the picture', type: 'color' },
          link(),
        ],
      },
      { key: 'linkLabel', label: 'Link label', type: 'text' },
      look,
    ],
    defaults: {
      label: 'Selected work',
      period: '2024 — 2026',
      projects: [
        {
          title: 'Fun Arena',
          year: '2026',
          kind: 'Mobile app design & build',
          note: '(Live on iOS & Android)',
          tag: 'App',
          image: '',
          color: '#3b3f9e',
          link: '',
        },
        {
          title: 'WellPaws',
          year: '2025',
          kind: 'Shopify design & build',
          note: '',
          tag: 'Shopify',
          image: '',
          color: '#a9cddb',
          link: '',
        },
        { title: 'ShopM2M', year: '2024', kind: 'Shopify design & build', note: '', tag: 'Shopify', image: '', color: '#e9e6df', link: '' },
        {
          title: 'Digital Media Team',
          year: '2025',
          kind: 'Webflow build',
          note: '',
          tag: 'Webflow',
          image: '',
          color: '#e5202e',
          link: '',
        },
      ],
      linkLabel: 'View project →',
      look: 'dark',
    },
  },
  {
    type: 'close-up-strip',
    label: 'Close-up strip',
    icon: 'mdi-view-carousel-outline',
    category: 'folio',
    description:
      'A row of large pictures running off the page that moves sideways as you scroll and can be dragged, each with a numbered caption and a short tag.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'hint', label: 'Hint', type: 'text' },
      {
        key: 'items',
        label: 'Pictures',
        type: 'list',
        itemLabel: 'caption',
        max: 16,
        fields: [
          { key: 'image', label: 'Picture', type: 'image' },
          { key: 'caption', label: 'Caption', type: 'text' },
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'color', label: 'Background without a picture', type: 'color' },
        ],
      },
      look,
    ],
    defaults: {
      label: '(Up close)',
      hint: 'Drag or scroll',
      items: [
        { image: '', caption: '(01) Fun Arena', tag: 'Mobile', color: '#3b3f9e' },
        { image: '', caption: '(01) Fun Arena', tag: 'Detail', color: '#2c5aa0' },
        { image: '', caption: '(02) WellPaws', tag: 'Mobile', color: '#a9cddb' },
        { image: '', caption: '(02) WellPaws', tag: 'Detail', color: '#1b1f5c' },
        { image: '', caption: '(03) ShopM2M', tag: 'Mobile', color: '#1e2a44' },
        { image: '', caption: '(04) Digital Media Team', tag: 'Mobile', color: '#e5202e' },
      ],
      look: 'dark',
    },
  },
  {
    type: 'hello-statement',
    label: 'Hello statement',
    icon: 'mdi-hand-wave-outline',
    category: 'folio',
    description:
      'A small label and a big, bold sentence that lights up word by word as you scroll, with some words in light italics and some in the main color.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      {
        key: 'text',
        label: 'Sentence',
        type: 'textarea',
        help: 'Put words between *stars* for light italics and between _underscores_ for the main color.',
      },
      look,
    ],
    defaults: {
      label: '(Hello)',
      text: "I'm Mike. I design and build websites and apps that *move, respond* and feel good to use. Designed in Figma, built in code, made in _Manchester._",
      look: 'dark',
    },
  },
  {
    type: 'service-grid',
    label: 'Numbered service grid',
    icon: 'mdi-view-grid-outline',
    category: 'folio',
    description:
      'A label and a link above a row of outlined cells, each with a number and an arrow in the main color, a title and a short text; pointing at one lights it up.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'linkLabel', label: 'Link label', type: 'text' },
      { key: 'link', label: 'Link', type: 'url' },
      {
        key: 'services',
        label: 'Services',
        type: 'list',
        itemLabel: 'title',
        max: 8,
        fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }, link()],
      },
      look,
    ],
    defaults: {
      label: 'What I do',
      linkLabel: 'All services →',
      link: '',
      services: [
        { title: 'Websites', text: 'Marketing sites and portfolios, designed and built with motion baked in.', link: '' },
        { title: 'Shopify', text: 'Custom Shopify themes built around your brand and products.', link: '' },
        { title: 'Webflow', text: 'Webflow builds your team can edit on their own.', link: '' },
        { title: 'Apps', text: 'Mobile app UI / UX development, from early flows to launch.', link: '' },
      ],
      look: 'dark',
    },
  },
  {
    type: 'talk-footer',
    label: '"Let\'s talk" footer',
    icon: 'mdi-message-text-outline',
    category: 'folio',
    description:
      'A small question and huge words rising in, then one line with the email, profile links, the city with its live local time and a "back to top" link.',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'title', label: 'Big words', type: 'text' },
      { key: 'link', label: 'Link of the big words', type: 'url', help: 'Leave empty to send an email.' },
      { key: 'email', label: 'Email', type: 'text' },
      {
        key: 'social',
        label: 'Profile links',
        type: 'list',
        itemLabel: 'label',
        max: 6,
        fields: [{ key: 'label', label: 'Text', type: 'text' }, link()],
      },
      ...placeFields,
      { key: 'topLabel', label: 'Back to top label', type: 'text' },
      look,
    ],
    defaults: {
      label: 'Got something in mind?',
      title: "LET'S TALK",
      link: '',
      email: 'hello@example.com',
      social: [
        { label: 'LinkedIn', link: 'https://www.linkedin.com/' },
        { label: 'GitHub', link: 'https://github.com/' },
      ],
      city: 'Manchester',
      timeZone: 'Europe/London',
      topLabel: 'Back to top ↑',
      look: 'dark',
    },
  },
];
