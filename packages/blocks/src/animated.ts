import type { BlockDef, FieldDef } from './types.js';

/** Wix-style blocks whose point is motion. Every one stands still for visitors who turn off animations. */

const button = (prefix = ''): FieldDef[] => [
  { key: prefix ? `${prefix}ButtonLabel` : 'buttonLabel', label: prefix ? 'Second button label' : 'Button label', type: 'text' },
  { key: prefix ? `${prefix}ButtonLink` : 'buttonLink', label: prefix ? 'Second button link' : 'Button link', type: 'url' },
];

/** Entrance animations any block can use, like Wix's "Animation" panel. */
export const entranceAnimations = [
  { value: '', label: 'None' },
  { value: 'fade', label: 'Fade in' },
  { value: 'rise', label: 'Float up' },
  { value: 'slide-start', label: 'Slide from the start side' },
  { value: 'slide-end', label: 'Slide from the end side' },
  { value: 'zoom', label: 'Zoom in' },
  { value: 'flip', label: 'Flip in' },
  { value: 'blur', label: 'Blur in' },
  { value: 'reveal', label: 'Reveal (wipe)' },
];

export const animatedDefinitions: BlockDef[] = [
  {
    type: 'aurora-hero',
    label: 'Aurora hero',
    icon: 'mdi-creation',
    category: 'animated',
    description:
      'Glowing colors drifting behind a headline whose words rise in one by one, with a word that keeps changing and a light that follows the mouse.',
    fields: [
      { key: 'eyebrow', label: 'Small line above', type: 'text' },
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'words', label: 'Changing words', type: 'text', help: 'Separated by commas; they take turns at the end of the headline.' },
      { key: 'text', label: 'Text', type: 'textarea' },
      ...button(),
      ...button('second'),
      { key: 'color', label: 'Third glow color', type: 'color', help: 'The other two are the theme’s main and second colors.' },
      {
        key: 'look',
        label: 'Look',
        type: 'select',
        options: [
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ],
      },
    ],
    defaults: {
      eyebrow: 'Design studio',
      title: 'We craft',
      words: 'websites, brands, experiences',
      text: 'A small team making things that look good, load fast and feel alive.',
      buttonLabel: 'Start a project',
      buttonLink: '#contact',
      secondButtonLabel: 'See our work',
      secondButtonLink: '#projects',
      color: '#7c5cff',
      look: 'dark',
    },
  },
  {
    type: 'scroll-text',
    label: 'Scroll-lit text',
    icon: 'mdi-text-shadow',
    category: 'animated',
    description: 'A big statement whose words light up one after another as the visitor scrolls.',
    fields: [
      { key: 'eyebrow', label: 'Small line above', type: 'text' },
      { key: 'text', label: 'Statement', type: 'textarea' },
    ],
    defaults: {
      eyebrow: 'Our approach',
      text: 'We believe a website should feel like walking into a well designed room: calm, clear, and full of small surprises that make you want to stay a little longer.',
    },
  },
  {
    type: 'counters',
    label: 'Counters',
    icon: 'mdi-counter',
    category: 'animated',
    description: 'Numbers that count up when they come into view.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Numbers',
        type: 'list',
        itemLabel: 'label',
        max: 6,
        fields: [
          { key: 'value', label: 'Number', type: 'number' },
          { key: 'prefix', label: 'Before the number', type: 'text', help: 'e.g. $' },
          { key: 'suffix', label: 'After the number', type: 'text', help: 'e.g. + or %' },
          { key: 'label', label: 'Label', type: 'text' },
        ],
      },
    ],
    defaults: {
      title: 'In numbers',
      items: [
        { value: 12, prefix: '', suffix: '+', label: 'Years of work' },
        { value: 340, prefix: '', suffix: '', label: 'Projects delivered' },
        { value: 98, prefix: '', suffix: '%', label: 'Happy clients' },
        { value: 24, prefix: '', suffix: '/7', label: 'Support' },
      ],
    },
  },
  {
    type: 'logo-strip',
    label: 'Logo strip',
    icon: 'mdi-dots-horizontal-circle-outline',
    category: 'animated',
    description: 'Client or partner logos gliding past endlessly, grey until hovered.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'logos',
        label: 'Logos',
        type: 'list',
        itemLabel: 'name',
        max: 30,
        fields: [
          { key: 'image', label: 'Logo', type: 'image' },
          { key: 'name', label: 'Name', type: 'text', help: 'Shown when there is no logo, and read by screen readers.' },
          { key: 'link', label: 'Link', type: 'url' },
        ],
      },
      { key: 'seconds', label: 'Seconds per loop', type: 'number' },
      { key: 'twoRows', label: 'Second row moving the other way', type: 'boolean' },
      {
        key: 'look',
        label: 'Background',
        type: 'select',
        help: 'Choose dark for white logos.',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ],
      },
    ],
    defaults: {
      title: 'Trusted by',
      logos: ['Northwind', 'Lumen', 'Atlas', 'Kite', 'Orbit', 'Juniper', 'Vertex', 'Harbor'].map((name) => ({ image: '', name, link: '' })),
      seconds: 30,
      twoRows: false,
      look: 'light',
    },
  },
  {
    type: 'horizontal-scroll',
    label: 'Horizontal scroll',
    icon: 'mdi-gesture-swipe-horizontal',
    category: 'animated',
    description: 'The page pauses while cards slide sideways as the visitor scrolls down, with a progress bar.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      {
        key: 'cards',
        label: 'Cards',
        type: 'list',
        itemLabel: 'title',
        max: 12,
        fields: [
          { key: 'image', label: 'Photo', type: 'image' },
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'link', label: 'Link', type: 'url' },
        ],
      },
    ],
    defaults: {
      title: 'Selected work',
      text: 'Keep scrolling: the projects slide past.',
      cards: [
        { image: '', tag: 'Brand', title: 'Northwind Coffee', text: 'Identity and packaging for a roastery.', link: '' },
        { image: '', tag: 'Website', title: 'Lumen Studio', text: 'A portfolio that loads in under a second.', link: '' },
        { image: '', tag: 'App', title: 'Kite', text: 'Booking for climbing gyms.', link: '' },
        { image: '', tag: 'Campaign', title: 'Orbit Bikes', text: 'Launch films and a pop-up store.', link: '' },
        { image: '', tag: 'Website', title: 'Harbor Hotel', text: 'Rooms, rates and stories by the sea.', link: '' },
      ],
    },
  },
  {
    type: 'tilt-cards',
    label: '3D tilt cards',
    icon: 'mdi-rotate-3d-variant',
    category: 'animated',
    description: 'Cards that tilt toward the mouse in 3D, with a moving shine.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Cards',
        type: 'list',
        itemLabel: 'title',
        max: 8,
        fields: [
          { key: 'image', label: 'Photo or icon', type: 'image' },
          { key: 'icon', label: 'Icon name (if no photo)', type: 'text', help: 'A Material Design Icons name, e.g. mdi-rocket-launch' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'link', label: 'Link', type: 'url' },
        ],
      },
    ],
    defaults: {
      title: 'What we do',
      items: [
        { image: '', icon: 'mdi-palette-outline', title: 'Design', text: 'Interfaces people enjoy using.', link: '' },
        { image: '', icon: 'mdi-code-tags', title: 'Development', text: 'Fast, accessible, easy to edit.', link: '' },
        { image: '', icon: 'mdi-rocket-launch-outline', title: 'Launch', text: 'Hosting, analytics and growth.', link: '' },
      ],
    },
  },
  {
    type: 'flip-cards',
    label: 'Flip cards',
    icon: 'mdi-card-multiple-outline',
    category: 'animated',
    description: 'Cards that turn over on hover (or tap) to show more on the back.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Cards',
        type: 'list',
        itemLabel: 'title',
        max: 8,
        fields: [
          { key: 'image', label: 'Front photo', type: 'image' },
          { key: 'title', label: 'Front title', type: 'text' },
          { key: 'back', label: 'Back text', type: 'textarea' },
          ...button(),
        ],
      },
    ],
    defaults: {
      title: 'Meet the team',
      items: [
        {
          image: '',
          title: 'Sara, design',
          back: 'Loves typography, plants and very small details.',
          buttonLabel: 'Say hi',
          buttonLink: '',
        },
        { image: '', title: 'Omid, code', back: 'Makes things fast. Has opinions about coffee.', buttonLabel: 'Say hi', buttonLink: '' },
        {
          image: '',
          title: 'Lena, projects',
          back: 'Keeps every launch on time and every client calm.',
          buttonLabel: 'Say hi',
          buttonLink: '',
        },
      ],
    },
  },
  {
    type: 'before-after',
    label: 'Before / after',
    icon: 'mdi-compare-horizontal',
    category: 'animated',
    description: 'Two photos on top of each other with a handle to drag between them.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'before', label: 'Before photo', type: 'image' },
      { key: 'after', label: 'After photo', type: 'image' },
      { key: 'beforeLabel', label: 'Before label', type: 'text' },
      { key: 'afterLabel', label: 'After label', type: 'text' },
    ],
    defaults: { title: 'The difference', before: '', after: '', beforeLabel: 'Before', afterLabel: 'After' },
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    icon: 'mdi-comment-quote-outline',
    category: 'animated',
    description: 'Quotes that take turns, with a progress line and the person’s photo.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Quotes',
        type: 'list',
        itemLabel: 'name',
        max: 12,
        fields: [
          { key: 'quote', label: 'Quote', type: 'textarea' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role or company', type: 'text' },
          { key: 'photo', label: 'Photo', type: 'image' },
        ],
      },
      { key: 'seconds', label: 'Seconds per quote', type: 'number' },
    ],
    defaults: {
      title: 'Kind words',
      items: [
        {
          quote: 'They understood what we wanted before we could explain it. The new site doubled our bookings.',
          name: 'Maryam K.',
          role: 'Harbor Hotel',
          photo: '',
        },
        {
          quote: 'Fast, friendly and honest about what matters. We will work with them again.',
          name: 'Daniel R.',
          role: 'Kite',
          photo: '',
        },
        { quote: 'Our customers keep telling us how good the shop feels to use.', name: 'Nora S.', role: 'Northwind Coffee', photo: '' },
      ],
      seconds: 6,
    },
  },
  {
    type: 'timeline',
    label: 'Timeline',
    icon: 'mdi-timeline-text-outline',
    category: 'animated',
    description: 'Milestones along a line that draws itself as the visitor scrolls.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Milestones',
        type: 'list',
        itemLabel: 'title',
        max: 20,
        fields: [
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      },
    ],
    defaults: {
      title: 'Our story',
      items: [
        { date: '2012', title: 'Two people, one table', text: 'The studio starts in a spare room.' },
        { date: '2016', title: 'First big client', text: 'A hotel group trusts us with all their sites.' },
        { date: '2020', title: 'A team of twenty', text: 'New office, new crafts: video and motion.' },
        { date: 'Today', title: 'Still curious', text: 'Every project still starts with listening.' },
      ],
    },
  },
  {
    type: 'parallax',
    label: 'Parallax layers',
    icon: 'mdi-layers-triple-outline',
    category: 'animated',
    description:
      'Layers of pictures that move at different speeds as the visitor scrolls (and a little with the mouse), giving depth. Without photos it shows layered hills in your colors.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      ...button(),
      {
        key: 'layers',
        label: 'Layers (back to front)',
        type: 'list',
        itemLabel: 'speed',
        max: 5,
        fields: [
          { key: 'image', label: 'Picture', type: 'image', help: 'Front layers look best as cut-outs (PNG/WebP with transparency).' },
          {
            key: 'speed',
            label: 'Movement',
            type: 'select',
            options: [
              { value: 'still', label: 'Still' },
              { value: 'slow', label: 'Slow' },
              { value: 'medium', label: 'Medium' },
              { value: 'fast', label: 'Fast' },
              { value: 'reverse', label: 'Against the scroll' },
            ],
          },
          {
            key: 'fit',
            label: 'Fit',
            type: 'select',
            options: [
              { value: 'cover', label: 'Fill the area' },
              { value: 'bottom', label: 'Sit at the bottom' },
            ],
          },
        ],
      },
      { key: 'mouse', label: 'Layers follow the mouse a little', type: 'boolean' },
      {
        key: 'height',
        label: 'Height',
        type: 'select',
        options: [
          { value: 'full', label: 'Full screen' },
          { value: 'tall', label: 'Tall' },
        ],
      },
    ],
    defaults: {
      title: 'Go further',
      text: 'Every layer moves at its own pace.',
      buttonLabel: 'Explore',
      buttonLink: '#',
      layers: [
        { image: '', speed: 'slow', fit: 'cover' },
        { image: '', speed: 'medium', fit: 'bottom' },
        { image: '', speed: 'fast', fit: 'bottom' },
      ],
      mouse: true,
      height: 'full',
    },
  },
  {
    type: 'sticky-story',
    label: 'Sticky story',
    icon: 'mdi-book-open-page-variant-outline',
    category: 'animated',
    description: 'A picture stays in place while the text scrolls past beside it; the picture changes with each step.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'imageSide',
        label: 'Picture side',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'end', label: 'End' },
        ],
      },
      {
        key: 'steps',
        label: 'Steps',
        type: 'list',
        itemLabel: 'title',
        max: 10,
        fields: [
          { key: 'image', label: 'Picture', type: 'image' },
          { key: 'eyebrow', label: 'Small line', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      },
    ],
    defaults: {
      title: 'How it works',
      imageSide: 'start',
      steps: [
        {
          image: '',
          eyebrow: 'Step 1',
          title: 'We listen',
          text: 'A first call to understand who you are, who you serve and what success looks like.',
        },
        { image: '', eyebrow: 'Step 2', title: 'We sketch', text: 'Ideas on paper, then in the browser, shared with you every week.' },
        { image: '', eyebrow: 'Step 3', title: 'We build', text: 'Fast pages, easy editing, and every detail checked on real phones.' },
        { image: '', eyebrow: 'Step 4', title: 'We launch', text: 'Go live, measure, and keep improving together.' },
      ],
    },
  },
];
