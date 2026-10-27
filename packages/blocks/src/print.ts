import type { BlockDef, FieldOption } from './types.js';

/** Block types whose designs the API accepts and puts under Admin → Print orders. */
export const designBlockTypes = ['textile-designer'];

/**
 * The surfaces a visitor can design on. The shape is drawn by the web app (components/blocks/print/surfaces.ts);
 * `printCm` is the size of the printed area, used for the print file and its resolution check.
 */
export const printSurfaces: { key: string; label: string; printCm: [number, number] }[] = [
  { key: 'tshirt', label: 'T-shirt (all-over)', printCm: [76, 76] },
  { key: 'hoodie', label: 'Hoodie (all-over)', printCm: [80, 80] },
  { key: 'apron', label: 'Apron', printCm: [60, 92] },
  { key: 'tote', label: 'Tote bag', printCm: [38, 42] },
  { key: 'pillow', label: 'Cushion / pillow', printCm: [45, 45] },
  { key: 'scarf', label: 'Silk scarf', printCm: [90, 90] },
  { key: 'flag', label: 'Flag / banner', printCm: [150, 90] },
  { key: 'fabric', label: 'Fabric by the meter', printCm: [140, 100] },
  { key: 'mousepad', label: 'Mouse pad', printCm: [24, 19] },
  { key: 'mug', label: 'Mug (wrap)', printCm: [20, 9] },
];

const surfaceOptions: FieldOption[] = printSurfaces.map((s) => ({ value: s.key, label: s.label }));

export const printDefinitions: BlockDef[] = [
  {
    type: 'textile-designer',
    label: 'Sublimation designer',
    icon: 'mdi-tshirt-crew-outline',
    category: 'contact',
    description:
      'Visitors design their own print: pick a product (with photos of real prints made for customers, and their design on a model), color and fabric, add photos and text, move, pinch, rotate, tile them as a pattern, then send the design with their phone number. Designs arrive in Admin → Print orders with a print-ready file.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      {
        key: 'products',
        label: 'Products',
        type: 'list',
        itemLabel: 'name',
        max: 12,
        fields: [
          { key: 'surface', label: 'Shape', type: 'select', options: surfaceOptions },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'price', label: 'Price (optional)', type: 'text', help: 'Shown as written, e.g. “from 450,000 T”.' },
          { key: 'sizes', label: 'Sizes (comma-separated)', type: 'text', help: 'Leave empty when the product has one size.' },
          {
            key: 'photos',
            label: 'Real-world photos',
            type: 'list',
            itemLabel: 'caption',
            max: 12,
            help: 'Photos of this product printed for real customers. Shown under the products when a visitor picks it.',
            fields: [
              { key: 'image', label: 'Photo', type: 'image' },
              { key: 'caption', label: 'Caption (optional)', type: 'text' },
            ],
          },
          {
            key: 'models',
            label: 'Model photos',
            type: 'list',
            itemLabel: 'label',
            max: 6,
            help: 'Photos of a person wearing this product, plain and light colored. Visitors see their design on them.',
            fields: [
              { key: 'image', label: 'Photo', type: 'image' },
              {
                key: 'area',
                label: 'Print area',
                type: 'quad',
                imageField: 'image',
                help: 'Drag the four corners to where the corners of the print sit on the photo.',
              },
              {
                key: 'mask',
                label: 'Fabric mask (optional)',
                type: 'image',
                help: 'A PNG the size of the photo, white where the fabric is. Leave empty to find the fabric automatically (works for a light shirt on a darker or colorful background).',
              },
              { key: 'label', label: 'Name (optional)', type: 'text' },
            ],
          },
        ],
      },
      {
        key: 'colors',
        label: 'Base colors (comma-separated)',
        type: 'text',
        help: 'Sublimation ink is see-through, so light (ideally white) polyester gives true colors.',
      },
      { key: 'materials', label: 'Fabrics (comma-separated)', type: 'text' },
      { key: 'maxQuantity', label: 'Largest quantity per order', type: 'number' },
      {
        key: 'maxDesigns',
        label: 'Designs one person can send',
        type: 'number',
        help: 'Counted per phone number and per browser; cancelled orders do not count. 0 means no limit.',
      },
      { key: 'maxPhotos', label: 'Photos in one design', type: 'number', help: '0 means no limit (up to 30 layers).' },
      {
        key: 'showMyDesigns',
        label: 'Show visitors the designs they sent',
        type: 'boolean',
        help: 'A “My designs” tab with each design’s preview and where its order stands. Kept in their browser.',
      },
      { key: 'submitLabel', label: 'Button label', type: 'text' },
      { key: 'successMessage', label: 'Message after sending', type: 'textarea' },
    ],
    defaults: {
      title: 'Design your own print',
      text: 'Pick a product, add your photos or text, and send the design. We will call you back to confirm the details.',
      products: [
        { surface: 'tshirt', name: 'T-shirt', price: '', sizes: 'S, M, L, XL, XXL', photos: [], models: [] },
        { surface: 'hoodie', name: 'Hoodie', price: '', sizes: 'S, M, L, XL, XXL', photos: [], models: [] },
        { surface: 'pillow', name: 'Cushion', price: '', sizes: '40×40, 45×45, 50×50', photos: [], models: [] },
        { surface: 'tote', name: 'Tote bag', price: '', sizes: '', photos: [], models: [] },
        { surface: 'scarf', name: 'Silk scarf', price: '', sizes: '70×70, 90×90', photos: [], models: [] },
        { surface: 'fabric', name: 'Fabric by the meter', price: '', sizes: '', photos: [], models: [] },
        { surface: 'mug', name: 'Mug', price: '', sizes: '', photos: [], models: [] },
      ],
      colors: '#ffffff, #f8f5ee, #e5e7eb, #fef3c7, #dbeafe, #fce7f3',
      materials: 'Polyester, Microfiber, Satin, Polyester-cotton 65/35',
      maxQuantity: 500,
      maxDesigns: 5,
      maxPhotos: 10,
      showMyDesigns: true,
      submitLabel: 'Send my design',
      successMessage: 'Thank you! We received your design and will call you back soon.',
    },
  },
];
