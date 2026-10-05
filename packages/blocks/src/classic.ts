import type { BlockDef, FieldDef } from './types.js';

/**
 * The 12 section kinds of minicms (`scrollview/kinds/kind-1 … kind-12`), rebuilt as blocks.
 * Most kinds had a separate photo for phones, so they keep that option.
 */

const button: FieldDef[] = [
  { key: 'buttonLabel', label: 'Button label', type: 'text' },
  { key: 'buttonLink', label: 'Button link', type: 'url' },
];

const mobileImage: FieldDef = {
  key: 'mobileImage',
  label: 'Photo on phones',
  type: 'image',
  help: 'Optional; a portrait crop looks best.',
};

/** Form fields, shared with the Contact form block. */
export const formFieldsField: FieldDef = {
  key: 'fields',
  label: 'Form fields',
  type: 'list',
  itemLabel: 'label',
  max: 20,
  fields: [
    { key: 'label', label: 'Label', type: 'text' },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'text', label: 'Short text' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
        { value: 'textarea', label: 'Long text' },
        { value: 'select', label: 'Choice' },
      ],
    },
    { key: 'required', label: 'Required', type: 'boolean' },
    { key: 'options', label: 'Choices (comma-separated)', type: 'text' },
    { key: 'placeholder', label: 'Placeholder', type: 'text' },
  ],
};

/** Block types whose messages the API accepts and puts in the inbox. */
export const formBlockTypes = ['contact-form', 'contact-split'];

/** Rows × columns, written as in minicms ("2*4"). */
const gridSizes = (sizes: string[]) => sizes.map((s) => ({ value: s, label: s.replace('*', ' rows × ') + ' columns' }));

export const classicDefinitions: BlockDef[] = [
  {
    type: 'video-cover',
    label: '1 · Full-screen video',
    icon: 'mdi-filmstrip',
    category: 'classic',
    description: 'A muted video across the whole width, with its own version for phones and a light title on top.',
    fields: [
      { key: 'video', label: 'Video', type: 'video' },
      { key: 'mobileVideo', label: 'Video on phones', type: 'video', help: 'Optional; a portrait video looks best.' },
      { key: 'poster', label: 'Image shown while loading', type: 'image' },
      { key: 'title', label: 'Title', type: 'text' },
    ],
    defaults: { video: '', mobileVideo: '', poster: '', title: 'Every project begins with a conversation' },
  },
  {
    type: 'triple',
    label: '2 · Three photo links',
    icon: 'mdi-view-column-outline',
    category: 'classic',
    description: 'A title over up to three wide photos. Hovering one zooms it and slides its text up.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Photos',
        type: 'list',
        itemLabel: 'title',
        max: 3,
        fields: [
          { key: 'image', label: 'Photo', type: 'image' },
          mobileImage,
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'link', label: 'Link', type: 'url' },
        ],
      },
    ],
    defaults: {
      title: 'Our services',
      items: [
        { image: '', mobileImage: '', title: 'Architecture', text: 'Buildings designed around the people who use them.', link: '' },
        { image: '', mobileImage: '', title: 'Interiors', text: 'Spaces with light, materials and detail in balance.', link: '' },
        { image: '', mobileImage: '', title: 'Landscape', text: 'Gardens and courtyards that grow with the building.', link: '' },
      ],
    },
  },
  {
    type: 'horizon',
    label: '3 · Photo with caption',
    icon: 'mdi-panorama-outline',
    category: 'classic',
    description: 'A full-width photo with a title and text over it. The photo can be blurred so the words stand out.',
    fields: [
      { key: 'image', label: 'Photo', type: 'image' },
      mobileImage,
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'blur', label: 'Blur the photo behind the text', type: 'boolean' },
    ],
    defaults: {
      image: '',
      mobileImage: '',
      title: 'Light, space and material',
      text: 'A sentence or two about the idea behind your work, written over a calm photo.',
      blur: true,
    },
  },
  {
    type: 'side-by-side',
    label: '4 · Side by side',
    icon: 'mdi-view-split-vertical',
    category: 'classic',
    description: 'Half photo, half text: a big title with a two-line label, short paragraphs that open on hover, and a glass button.',
    fields: [
      { key: 'image', label: 'Photo', type: 'image' },
      mobileImage,
      {
        key: 'imageSide',
        label: 'Photo side',
        type: 'select',
        options: [
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
        ],
      },
      { key: 'bigTitle', label: 'Big title', type: 'text' },
      { key: 'smallTitle', label: 'Label beside the title', type: 'text', help: 'Each word goes on its own line.' },
      {
        key: 'lines',
        label: 'Paragraphs',
        type: 'list',
        itemLabel: 'text',
        max: 6,
        fields: [{ key: 'text', label: 'Text', type: 'textarea' }],
      },
      ...button,
    ],
    defaults: {
      image: '',
      mobileImage: '',
      imageSide: 'right',
      bigTitle: '12',
      smallTitle: 'Years experience',
      lines: [
        { text: 'We started with small houses and grew into a studio that designs offices, hotels and public spaces.' },
        { text: 'Every project is led by the same people from the first sketch to the last site visit.' },
        { text: 'Hover a paragraph to read all of it.' },
      ],
      buttonLabel: 'About us',
      buttonLink: '#',
    },
  },
  {
    type: 'horizon-right',
    label: '5 · Photo right, text left',
    icon: 'mdi-page-layout-sidebar-right',
    category: 'classic',
    description: 'A tall photo on the right with a title and text beside it, sliding in as you scroll.',
    fields: [
      { key: 'image', label: 'Photo', type: 'image' },
      mobileImage,
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
    ],
    defaults: {
      image: '',
      mobileImage: '',
      title: 'Designed for daylight',
      text: 'Tall windows and deep reveals bring soft light into every room through the whole day.',
    },
  },
  {
    type: 'horizon-left',
    label: '6 · Photo left, text right',
    icon: 'mdi-page-layout-sidebar-left',
    category: 'classic',
    description: 'The mirror of kind 5: a tall photo on the left with a title and text beside it.',
    fields: [
      { key: 'image', label: 'Photo', type: 'image' },
      mobileImage,
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
    ],
    defaults: {
      image: '',
      mobileImage: '',
      title: 'Built to last',
      text: 'Honest materials, careful details and a plan that leaves room for the next generation.',
    },
  },
  {
    type: 'contact-split',
    label: '7 · Contact with photo',
    icon: 'mdi-card-account-mail-outline',
    category: 'classic',
    description: 'A photo beside a contact form on frosted glass, with your address and email. Messages go to the inbox.',
    fields: [
      { key: 'image', label: 'Photo', type: 'image' },
      { key: 'title', label: 'Title', type: 'text', help: 'The first two words are large; the rest sit beside them.' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      formFieldsField,
      { key: 'submitLabel', label: 'Button label', type: 'text' },
      { key: 'successMessage', label: 'Message after sending', type: 'textarea' },
    ],
    defaults: {
      image: '',
      title: 'Let’s talk about your project',
      text: 'Every project begins long before it becomes a drawing. It starts with a simple conversation.',
      address: '',
      email: 'hello@example.com',
      phone: '',
      fields: [
        { label: 'Name', type: 'text', required: true, options: '', placeholder: '' },
        { label: 'Email', type: 'email', required: true, options: '', placeholder: 'you@example.com' },
        { label: 'Phone', type: 'tel', required: false, options: '', placeholder: '' },
        { label: 'Subject', type: 'text', required: false, options: '', placeholder: '' },
        { label: 'Message', type: 'textarea', required: true, options: '', placeholder: '' },
      ],
      submitLabel: 'Send message',
      successMessage: 'Thank you! We received your message.',
    },
  },
  {
    type: 'information',
    label: '8 · Information',
    icon: 'mdi-text-box-outline',
    category: 'classic',
    description: 'A title and intro, then a longer text with its own heading beside a portrait photo.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Intro', type: 'textarea' },
      { key: 'title2', label: 'Second title', type: 'text' },
      { key: 'subtitle2', label: 'Under the second title', type: 'text' },
      { key: 'body', label: 'Text', type: 'textarea', help: 'Separate paragraphs with a blank line.' },
      { key: 'image', label: 'Portrait photo', type: 'image' },
    ],
    defaults: {
      title: 'About the studio',
      text: 'Who we are and how we work.',
      title2: 'Our story',
      subtitle2: 'Since 2012',
      body: 'Write the first paragraph here.\n\nA second paragraph.\n\nAnd a third one.',
      image: '',
    },
  },
  {
    type: 'rich-text',
    label: '9 · Free text',
    icon: 'mdi-format-text-variant-outline',
    category: 'classic',
    description: 'Text you format yourself: headings, bold, lists, links and quotes.',
    fields: [{ key: 'html', label: 'Text', type: 'richtext' }],
    defaults: {
      html: '<h2>A heading</h2><p>Write freely here. Make words <strong>bold</strong> or <em>italic</em>, add <a href="#">links</a> and lists.</p><ul><li>First point</li><li>Second point</li></ul>',
    },
  },
  {
    type: 'video-showcase',
    label: '10 · Video with player',
    icon: 'mdi-play-circle-outline',
    category: 'classic',
    description: 'An uploaded video with its own controls (seek, volume, ±5 s, speed, full screen) on a soft glow.',
    fields: [
      { key: 'video', label: 'Video', type: 'video' },
      { key: 'poster', label: 'Cover image', type: 'image' },
      { key: 'mobileVideo', label: 'Video on phones', type: 'video', help: 'Optional.' },
      { key: 'mobilePoster', label: 'Cover image on phones', type: 'image' },
    ],
    defaults: { video: '', poster: '', mobileVideo: '', mobilePoster: '' },
  },
  {
    type: 'slider',
    label: '11 · Full-screen slider',
    icon: 'mdi-image-multiple',
    category: 'classic',
    description: 'Full-screen photos that fade into each other, with the caption, a button and arrows on glass at the bottom.',
    fields: [
      {
        key: 'slides',
        label: 'Slides',
        type: 'list',
        itemLabel: 'title',
        max: 12,
        fields: [{ key: 'image', label: 'Photo', type: 'image' }, mobileImage, { key: 'title', label: 'Caption', type: 'text' }, ...button],
      },
      { key: 'autoplay', label: 'Play automatically', type: 'boolean' },
      { key: 'seconds', label: 'Seconds per slide', type: 'number' },
    ],
    defaults: {
      slides: [
        { image: '', mobileImage: '', title: 'Villa on the hill', buttonLabel: 'View project', buttonLink: '' },
        { image: '', mobileImage: '', title: 'Office by the park', buttonLabel: 'View project', buttonLink: '' },
      ],
      autoplay: true,
      seconds: 5,
    },
  },
  {
    type: 'photo-grid',
    label: '12 · Chessboard grid',
    icon: 'mdi-checkerboard',
    category: 'classic',
    description: 'Photos in a fixed grid of rows and columns, with its own size for phones. Each opens a link or a larger view.',
    fields: [
      {
        key: 'size',
        label: 'Grid on large screens',
        type: 'select',
        options: gridSizes(['1*3', '1*4', '2*2', '2*3', '2*4', '3*3', '3*4', '4*4']),
      },
      { key: 'mobileSize', label: 'Grid on phones', type: 'select', options: gridSizes(['2*1', '3*1', '2*2', '3*2', '4*2', '6*2']) },
      {
        key: 'items',
        label: 'Photos',
        type: 'list',
        itemLabel: 'title',
        max: 16,
        fields: [
          { key: 'image', label: 'Photo', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'link', label: 'Link', type: 'url', help: 'Leave empty to open the photo larger instead.' },
        ],
      },
    ],
    defaults: {
      size: '2*4',
      mobileSize: '4*2',
      items: Array.from({ length: 8 }, (_, i) => ({ image: '', title: `Project ${i + 1}`, text: '', link: '' })),
    },
  },
];
