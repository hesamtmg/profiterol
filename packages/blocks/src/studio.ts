import type { BlockDef, FieldDef } from './types.js';

/**
 * The bold agency look of awakeagency.dev: huge type, a loud main color, rounded panels and things drawn as you
 * scroll. They take their colors from the theme (the "Studio Red" theme matches the original).
 */

const link = (label = 'Link'): FieldDef => ({ key: 'link', label, type: 'url' });

const linkList = (key: string, label: string, max: number): FieldDef => ({
  key,
  label,
  type: 'list',
  itemLabel: 'label',
  max,
  fields: [{ key: 'label', label: 'Text', type: 'text' }, link()],
});

const placeFields: FieldDef[] = [
  { key: 'placeLabel', label: 'Place label', type: 'text', help: 'e.g. Based in:' },
  { key: 'city', label: 'City', type: 'text' },
  {
    key: 'timeZone',
    label: 'Time zone for the clock',
    type: 'text',
    help: 'e.g. Europe/Warsaw or Asia/Tehran; the local time is shown after the city. Leave empty for no clock.',
  },
];

const look: FieldDef = {
  key: 'look',
  label: 'Colors',
  type: 'select',
  options: [
    { value: 'accent', label: 'Main color' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ],
};

export const studioDefinitions: BlockDef[] = [
  {
    type: 'type-hero',
    label: 'Big type hero',
    icon: 'mdi-format-letter-case-upper',
    category: 'studio',
    description:
      'A first screen of huge words pushed to both edges, rising in line by line, with round badges floating with the mouse and a live local clock.',
    fields: [
      {
        key: 'lines',
        label: 'Headline lines',
        type: 'list',
        itemLabel: 'start',
        max: 5,
        fields: [
          { key: 'start', label: 'Words at the start', type: 'text' },
          { key: 'end', label: 'Words at the end', type: 'text' },
        ],
        help: 'Each line has words at its start and its end, with space between.',
      },
      { key: 'text', label: 'Text', type: 'textarea' },
      {
        key: 'badges',
        label: 'Floating badges',
        type: 'list',
        itemLabel: 'label',
        max: 4,
        fields: [
          { key: 'label', label: 'Letter or short word', type: 'text' },
          { key: 'image', label: 'Or a picture', type: 'image' },
          { key: 'color', label: 'Color', type: 'color' },
        ],
      },
      ...placeFields,
      look,
    ],
    defaults: {
      lines: [
        { start: 'WE', end: 'BUILD' },
        { start: 'WEBSITES', end: 'PEOPLE' },
        { start: 'REMEMBER.', end: '' },
      ],
      text: 'A creative digital studio. We design and build premium websites and web products for teams who need to stand out.',
      badges: [
        { label: 'e', image: '', color: '#ffc2d1' },
        { label: 'a.', image: '', color: '#ffe3ea' },
        { label: '@', image: '', color: '#4a4f57' },
      ],
      placeLabel: 'Based in:',
      city: 'Warsaw',
      timeZone: 'Europe/Warsaw',
      look: 'accent',
    },
  },
  {
    type: 'blueprint-statement',
    label: 'Blueprint statement',
    icon: 'mdi-vector-square',
    category: 'studio',
    description:
      'Big sentences on a gray panel that light up word by word as you scroll, over guide lines, a circle and a square drawing themselves in.',
    fields: [
      {
        key: 'paragraphs',
        label: 'Sentences',
        type: 'list',
        itemLabel: 'text',
        max: 4,
        fields: [{ key: 'text', label: 'Text', type: 'textarea' }],
        help: 'One after another as the visitor scrolls.',
      },
    ],
    defaults: {
      paragraphs: [
        { text: 'We design and build websites, brand systems, and digital products that work as hard as they look.' },
        {
          text: "Whether you're launching a product, rebuilding a brand, or replacing a tired site, one team takes it from sketch to live build.",
        },
      ],
    },
  },
  {
    type: 'project-scatter',
    label: 'Scattered projects',
    icon: 'mdi-view-dashboard-variant-outline',
    category: 'studio',
    description:
      'A title as wide as the page, then project cards scattered in two staggered columns, with a line drawn behind them as you scroll.',
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
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'title', label: 'Name', type: 'text' },
          link(),
        ],
      },
      { key: 'line', label: 'Draw a line behind the cards', type: 'boolean' },
    ],
    defaults: {
      title: 'OUR PROJECTS',
      projects: [
        { image: '', category: 'Development', title: 'Mihailove', link: '' },
        { image: '', category: 'Development', title: 'Frame', link: '' },
        { image: '', category: 'Branding', title: 'Portfolio Ventures', link: '' },
        { image: '', category: 'Development', title: 'Manypixels', link: '' },
      ],
      line: true,
    },
  },
  {
    type: 'project-archive',
    label: 'Project archive',
    icon: 'mdi-format-list-text',
    category: 'studio',
    description: 'A list of project names with their category and year on a panel; pointing at one shows its picture beside the mouse.',
    fields: [
      {
        key: 'items',
        label: 'Projects',
        type: 'list',
        itemLabel: 'title',
        max: 20,
        fields: [
          { key: 'title', label: 'Name', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'image', label: 'Picture', type: 'image' },
          link(),
        ],
      },
      { key: 'buttonLabel', label: 'Link label', type: 'text' },
      { key: 'buttonLink', label: 'Link', type: 'url' },
      { key: 'line', label: 'Draw a zigzag behind the list', type: 'boolean' },
    ],
    defaults: {
      items: [
        { title: 'Condor', category: 'Development', year: '2026', image: '', link: '' },
        { title: 'Cortland', category: 'Web design', year: '2026', image: '', link: '' },
        { title: 'Rally', category: 'Development', year: '2025', image: '', link: '' },
        { title: 'Rhinestone', category: 'Development', year: '2025', image: '', link: '' },
        { title: 'Ezra', category: 'Development', year: '2024', image: '', link: '' },
      ],
      buttonLabel: 'VIEW ALL',
      buttonLink: '',
      line: true,
    },
  },
  {
    type: 'service-stack',
    label: 'Tilted service cards',
    icon: 'mdi-cards-outline',
    category: 'studio',
    description:
      'A dark panel with a big title; numbered service cards slide up over each other as you scroll and land a little tilted, like a pile of papers.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'services',
        label: 'Services',
        type: 'list',
        itemLabel: 'title',
        max: 8,
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          {
            key: 'drawing',
            label: 'Drawing',
            type: 'select',
            options: [
              { value: 'nodes', label: 'Boxes and lines' },
              { value: 'letter', label: 'Outlined letter' },
              { value: 'orbit', label: 'Planet and ring' },
              { value: 'circles', label: 'Circles' },
              { value: 'none', label: 'None' },
            ],
          },
          { key: 'buttonLabel', label: 'Button label', type: 'text' },
          { key: 'buttonLink', label: 'Button link', type: 'url' },
        ],
      },
    ],
    defaults: {
      title: 'SERVICES',
      services: [
        {
          title: 'Web development',
          text: 'We begin with a discovery session to understand your goals, timeline and the features you need, then build it fast and solid.',
          drawing: 'nodes',
          buttonLabel: 'more information',
          buttonLink: '',
        },
        {
          title: 'UX/UI design',
          text: 'A design workshop to study how people use your product, find what gets in their way and plan an interface they enjoy.',
          drawing: 'circles',
          buttonLabel: 'more information',
          buttonLink: '',
        },
        {
          title: 'Branding',
          text: 'A step-by-step, personal process that ends in a memorable brand identity, ready to make its mark.',
          drawing: 'letter',
          buttonLabel: 'more information',
          buttonLink: '',
        },
        {
          title: 'Maintenance & support',
          text: 'We put your site live, show your team how to run it, and stay around for updates and improvements.',
          drawing: 'orbit',
          buttonLabel: 'more information',
          buttonLink: '',
        },
      ],
    },
  },
  {
    type: 'need-picker',
    label: '"I need…" picker',
    icon: 'mdi-format-list-bulleted-type',
    category: 'studio',
    description:
      'A loud call to action: "I need" and a wheel of pills that turns by itself (development, web design, branding…); the button goes to the chosen one’s link.',
    fields: [
      { key: 'lead', label: 'Words before the wheel', type: 'text' },
      {
        key: 'options',
        label: 'Choices',
        type: 'list',
        itemLabel: 'label',
        max: 8,
        fields: [{ key: 'label', label: 'Text', type: 'text' }, link('Link when chosen')],
      },
      { key: 'buttonLabel', label: 'Button label', type: 'text' },
      look,
    ],
    defaults: {
      lead: 'I need',
      options: [
        { label: 'development', link: '#contact' },
        { label: 'web design', link: '#contact' },
        { label: 'branding', link: '#contact' },
      ],
      buttonLabel: 'next',
      look: 'accent',
    },
  },
  {
    type: 'studio-footer',
    label: 'Studio footer',
    icon: 'mdi-page-layout-footer',
    category: 'studio',
    description: 'A dark footer: the name, two columns of links, an email to copy with one click, the local time and the legal links.',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'logo', label: 'Or a logo', type: 'image' },
      linkList('links', 'Pages', 8),
      linkList('social', 'Elsewhere', 8),
      { key: 'emailLabel', label: 'Email label', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'copiedText', label: 'Shown after copying', type: 'text' },
      ...placeFields,
      { key: 'copyright', label: 'Copyright', type: 'text' },
      linkList('legal', 'Small links', 5),
    ],
    defaults: {
      name: 'studio.',
      logo: '',
      links: [
        { label: 'Home', link: '/' },
        { label: 'Services', link: '#services' },
        { label: 'Projects', link: '#projects' },
        { label: 'Contacts', link: '#contact' },
      ],
      social: [
        { label: 'LinkedIn', link: 'https://www.linkedin.com/' },
        { label: 'Instagram', link: 'https://www.instagram.com/' },
      ],
      emailLabel: 'Contact us',
      email: 'hello@example.com',
      copiedText: 'Copied to clipboard',
      placeLabel: 'Based in',
      city: 'Warsaw',
      timeZone: 'Europe/Warsaw',
      copyright: '© Studio. All rights reserved.',
      legal: [
        { label: 'PRIVACY', link: '' },
        { label: 'TERMS', link: '' },
      ],
    },
  },
];
