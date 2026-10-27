<script setup lang="ts">
/**
 * A sublimation print designer. Visitors pick a product, its color and fabric, then build the print from photos,
 * texts, stickers and background patterns: drag to move, pinch (or the corner handles, or the mouse wheel) to resize
 * and rotate, and repeat a photo across the fabric like a textile pattern. The design is sent with the visitor's
 * phone number as a mock-up preview and a print-ready file (150 dpi at the product's print size); admins see it
 * under Admin → Print orders and call back. Everything is drawn on canvases in the browser; photos never leave it
 * until the design is sent.
 */
import { parseMesh, printSurfaces } from '@profiterol/blocks';
import EditableText from '../site/EditableText.vue';
import {
  drawDesign,
  drawMockup,
  emptyBackground,
  filters,
  fonts,
  hitLayer,
  layerCorners,
  photoDpi,
  printPixels,
  surfaceOf,
  type BackgroundPattern,
  type Design,
  type ImageLayer,
  type ImageStore,
  type Layer,
  type Mask,
  type Repeat,
  type TextLayer,
} from './print/design';
import { loadPhoto, prepareModel, renderOnModel, type ModelPhoto } from './print/onModel';
import { surfaces } from './print/surfaces';

interface Product {
  surface: string;
  name: string;
  price: string;
  sizes: string;
  /** Photos of this product printed for real customers. Missing on blocks saved before the setting existed. */
  photos?: { image: string; caption: string }[];
  /** Photos of a person wearing the product, with the print's corners marked on them. */
  models?: { image: string; area: string; mask: string; label: string }[];
}

const props = defineProps<{
  p: {
    title: string;
    text: string;
    products: Product[];
    colors: string;
    materials: string;
    maxQuantity: number;
    /** Designs one person may send (0: no limit). Missing on blocks saved before the setting existed. */
    maxDesigns?: number;
    /** Photos in one design (0: no limit). */
    maxPhotos?: number;
    showMyDesigns?: boolean;
    submitLabel: string;
    successMessage: string;
  };
  locale: string;
  /** Added by the API on published pages; missing in the editor. */
  data?: { pageId: string; blockId: string };
}>();

const fa = computed(() => props.locale === 'fa');
const editing = Boolean(useBlockEditing());
const api = useApi();

const EN = {
  product: 'Product',
  design: 'Design',
  send: 'Send',
  baseColor: 'Base color',
  fabric: 'Fabric',
  size: 'Size',
  quantity: 'Quantity',
  next: 'Next',
  back: 'Back',
  addPhoto: 'Add photo',
  addText: 'Add text',
  stickers: 'Stickers',
  background: 'Background',
  hint: 'Drop or paste photos here. Drag to move; pinch, scroll or use the corners to resize and rotate.',
  noInk: 'No ink',
  pattern: 'Pattern',
  patternColor: 'Pattern color',
  patternSize: 'Pattern size',
  layers: 'Layers',
  scale: 'Size',
  rotate: 'Rotate',
  opacity: 'Opacity',
  flipH: 'Flip horizontally',
  flipV: 'Flip vertically',
  repeat: 'Repeat as a pattern',
  spacing: 'Spacing',
  filter: 'Filter',
  shape: 'Shape',
  text: 'Text',
  font: 'Font',
  color: 'Color',
  outline: 'Outline',
  curve: 'Curve',
  bold: 'Bold',
  italic: 'Italic',
  shadow: 'Shadow',
  duplicate: 'Duplicate',
  remove: 'Delete',
  forward: 'Bring forward',
  backward: 'Send backward',
  center: 'Center',
  fill: 'Cover the whole surface',
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Start over',
  clearConfirm: 'Remove everything from the design?',
  sharp: 'Sharp',
  good: 'Good',
  low: 'Low resolution: may print blurry',
  name: 'Your name',
  phone: 'Phone (we will call you back)',
  email: 'Email (optional)',
  notes: 'Notes for us (optional)',
  preparing: 'Preparing the print file…',
  sending: 'Sending…',
  summary: 'Your order',
  printArea: 'Print area',
  empty: 'Add a photo, text or background first.',
  newText: 'Your text',
  tooBig: 'This file is too large (40 MB at most).',
  notImage: 'Only photos (JPG, PNG, WebP, GIF) can be added.',
  tooMany: 'A design can have up to 30 layers.',
  mugHint: 'The print wraps around the mug; the dashed lines are the sides next to the handle.',
  tip: 'Sublimation prints best on white or light polyester; white parts of the design take no ink.',
  again: 'Design another',
  needName: 'Please write your name.',
  needPhone: 'Please write a phone number we can call you back on.',
  failed: 'The design could not be sent. Please try again.',
  selectHint: 'Tap a layer on the product to change it.',
  photo: 'Photo',
  mine: 'My designs',
  photoLimit: 'A design can have up to {n} photo(s).',
  remaining: 'You can send {n} more design(s).',
  limitReached: 'You have sent {n} designs, the most we take from one person. We will call you about them.',
  noDesigns: 'Designs you send appear here, so you can see where each order stands.',
  seeMine: 'See my designs',
  newDesign: 'New design',
  s_new: 'Received',
  s_called: 'We called you',
  s_production: 'Being printed',
  s_done: 'Ready',
  s_cancelled: 'Cancelled',
  samples: 'Made for our customers',
  closePhoto: 'Close',
  prevPhoto: 'Previous photo',
  nextPhoto: 'Next photo',
  onModel: 'On a model',
  seeOnModel: 'See it on a model',
  download: 'Download',
  modelFailed: 'This photo could not be loaded.',
} as const;

const FA: Record<keyof typeof EN, string> = {
  product: 'محصول',
  design: 'طراحی',
  send: 'ارسال',
  baseColor: 'رنگ پایه',
  fabric: 'پارچه',
  size: 'سایز',
  quantity: 'تعداد',
  next: 'بعدی',
  back: 'قبلی',
  addPhoto: 'افزودن عکس',
  addText: 'افزودن متن',
  stickers: 'استیکر',
  background: 'پس‌زمینه',
  hint: 'عکس‌ها را اینجا رها یا پیست کنید. برای جابه‌جایی بکشید؛ برای بزرگ‌کردن و چرخاندن دو انگشتی، اسکرول یا گوشه‌ها را بکشید.',
  noInk: 'بدون رنگ',
  pattern: 'الگو',
  patternColor: 'رنگ الگو',
  patternSize: 'اندازه‌ی الگو',
  layers: 'لایه‌ها',
  scale: 'اندازه',
  rotate: 'چرخش',
  opacity: 'شفافیت',
  flipH: 'قرینه‌ی افقی',
  flipV: 'قرینه‌ی عمودی',
  repeat: 'تکرار به شکل الگو',
  spacing: 'فاصله',
  filter: 'فیلتر',
  shape: 'شکل',
  text: 'متن',
  font: 'فونت',
  color: 'رنگ',
  outline: 'دورخط',
  curve: 'انحنا',
  bold: 'ضخیم',
  italic: 'کج',
  shadow: 'سایه',
  duplicate: 'تکثیر',
  remove: 'حذف',
  forward: 'جلوتر',
  backward: 'عقب‌تر',
  center: 'وسط',
  fill: 'پوشاندن کل سطح',
  undo: 'واگرد',
  redo: 'ازنو',
  clear: 'شروع دوباره',
  clearConfirm: 'همه‌چیز از طرح پاک شود؟',
  sharp: 'واضح',
  good: 'خوب',
  low: 'کیفیت پایین: ممکن است تار چاپ شود',
  name: 'نام شما',
  phone: 'شماره تماس (با شما تماس می‌گیریم)',
  email: 'ایمیل (اختیاری)',
  notes: 'توضیحات برای ما (اختیاری)',
  preparing: 'در حال آماده‌سازی فایل چاپ…',
  sending: 'در حال ارسال…',
  summary: 'سفارش شما',
  printArea: 'سطح چاپ',
  empty: 'اول یک عکس، متن یا پس‌زمینه اضافه کنید.',
  newText: 'متن شما',
  tooBig: 'این فایل خیلی بزرگ است (حداکثر ۴۰ مگابایت).',
  notImage: 'فقط عکس (JPG، PNG، WebP، GIF) اضافه می‌شود.',
  tooMany: 'هر طرح حداکثر ۳۰ لایه دارد.',
  mugHint: 'طرح دور ماگ می‌پیچد؛ خط‌چین‌ها دو طرف دسته هستند.',
  tip: 'چاپ سابلیمیشن روی پلی‌استر سفید یا روشن بهترین نتیجه را دارد؛ قسمت‌های سفید طرح جوهر نمی‌گیرند.',
  again: 'طراحی دوباره',
  needName: 'لطفا نامتان را بنویسید.',
  needPhone: 'لطفا شماره‌ای بنویسید که با شما تماس بگیریم.',
  failed: 'طرح ارسال نشد. دوباره تلاش کنید.',
  selectHint: 'برای تغییر، روی یک لایه روی محصول بزنید.',
  photo: 'عکس',
  mine: 'طرح‌های من',
  photoLimit: 'هر طرح حداکثر {n} عکس دارد.',
  remaining: 'می‌توانید {n} طرح دیگر بفرستید.',
  limitReached: 'شما {n} طرح فرستاده‌اید که بیشترین تعداد برای هر نفر است. درباره‌ی آن‌ها با شما تماس می‌گیریم.',
  noDesigns: 'طرح‌هایی که می‌فرستید اینجا می‌آیند تا ببینید سفارش هرکدام به کجا رسیده است.',
  seeMine: 'دیدن طرح‌های من',
  newDesign: 'طرح تازه',
  s_new: 'دریافت شد',
  s_called: 'با شما تماس گرفتیم',
  s_production: 'در حال چاپ',
  s_done: 'آماده است',
  s_cancelled: 'لغو شد',
  samples: 'نمونه‌های چاپ‌شده برای مشتری‌ها',
  closePhoto: 'بستن',
  prevPhoto: 'عکس قبلی',
  nextPhoto: 'عکس بعدی',
  onModel: 'روی مدل',
  seeOnModel: 'دیدن طرح روی مدل',
  download: 'دانلود',
  modelFailed: 'این عکس باز نشد.',
};

const t = computed(() => (fa.value ? FA : EN));
const fill = (text: string, n: number) => text.replace('{n}', fa.value ? n.toLocaleString('fa') : String(n));

/** A limit set on the block: 0 means none; blocks saved before the setting existed get its default. */
const limitOf = (value: unknown, fallback: number) => {
  const n = value === undefined || value === null || value === '' ? fallback : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};
const maxDesigns = computed(() => limitOf(props.p.maxDesigns, 5));
const maxPhotos = computed(() => limitOf(props.p.maxPhotos, 10));
const showMine = computed(() => props.p.showMyDesigns !== false);

const repeatNames: Record<Repeat, [string, string]> = {
  none: ['Off', 'خاموش'],
  grid: ['Grid', 'شبکه'],
  brick: ['Brick', 'آجری'],
  halfdrop: ['Half drop', 'نیم‌افت'],
  mirror: ['Mirror', 'آینه‌ای'],
};
const patternNames: Record<BackgroundPattern, [string, string]> = {
  none: ['Plain', 'ساده'],
  stripes: ['Stripes', 'راه‌راه'],
  dots: ['Dots', 'خال‌خالی'],
  checks: ['Gingham', 'چهارخانه'],
  zigzag: ['Zigzag', 'زیگزاگ'],
  waves: ['Waves', 'موج'],
  gradient: ['Gradient', 'گرادیان'],
};
const filterNames: Record<string, [string, string]> = {
  none: ['Original', 'اصلی'],
  vivid: ['Vivid', 'پررنگ'],
  bw: ['B&W', 'سیاه‌وسفید'],
  sepia: ['Sepia', 'قهوه‌ای'],
  warm: ['Warm', 'گرم'],
  cool: ['Cool', 'سرد'],
  fade: ['Faded', 'کم‌رنگ'],
  invert: ['Negative', 'نگاتیو'],
};
const maskNames: Record<Mask, [string, string]> = {
  none: ['Original', 'اصلی'],
  rounded: ['Rounded', 'گوشه‌گرد'],
  circle: ['Circle', 'دایره'],
  heart: ['Heart', 'قلب'],
  star: ['Star', 'ستاره'],
};
const name = (pair: [string, string]) => (fa.value ? pair[1] : pair[0]);
const stickers = ['★', '♥', '☀', '✿', '☾', '⚡', '🌸', '🌿', '🦋', '🎉', '🔥', '⚽', '🎵', '😍', '🐾', '👑'];

// ── Product choices ─────────────────────────────────────────────────────────────────────────────────────────

const products = computed(() => (props.p.products ?? []).filter((x) => surfaces[x.surface]));
const productIndex = ref(0);
const product = computed(() => products.value[productIndex.value] ?? products.value[0]);
const surface = computed(() => surfaceOf(product.value?.surface ?? 'tshirt'));
const printCm = computed(() => printSurfaces.find((s) => s.key === product.value?.surface)?.printCm ?? [76, 76]);
const colors = computed(() => formChoices(props.p.colors));
const materials = computed(() => formChoices(props.p.materials));
const sizes = computed(() => formChoices(product.value?.sizes ?? ''));
const color = ref('');
const material = ref('');
const size = ref('');
const quantity = ref(1);
const maxQuantity = computed(() => Math.max(1, Number(props.p.maxQuantity) || 500));
const base = computed(() => color.value || '#ffffff');

watch(colors, (list) => (color.value = list.includes(color.value) ? color.value : (list[0] ?? '')), { immediate: true });
watch(materials, (list) => (material.value = list.includes(material.value) ? material.value : (list[0] ?? '')), { immediate: true });
watch(sizes, (list) => (size.value = list.includes(size.value) ? size.value : (list[0] ?? '')), { immediate: true });
watch(products, (list) => (productIndex.value = Math.min(productIndex.value, Math.max(0, list.length - 1))));

/** Photos of the chosen product printed for real customers, and the one open full screen. */
const samples = computed(() => (product.value?.photos ?? []).filter((s) => s.image));
const sampleOpen = ref<number | null>(null);
const openSample = computed(() => (sampleOpen.value === null ? null : samples.value[sampleOpen.value]));
const stepSample = (by: number) => {
  if (sampleOpen.value === null || !samples.value.length) return;
  sampleOpen.value = (sampleOpen.value + by + samples.value.length) % samples.value.length;
};
const onSampleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') sampleOpen.value = null;
  // In RTL the "next" photo is to the left.
  else if (e.key === 'ArrowRight') stepSample(fa.value ? -1 : 1);
  else if (e.key === 'ArrowLeft') stepSample(fa.value ? 1 : -1);
};
watch(productIndex, () => (sampleOpen.value = null));
watch(sampleOpen, (open) => {
  if (!import.meta.client) return;
  if (open === null) window.removeEventListener('keydown', onSampleKey);
  else window.addEventListener('keydown', onSampleKey);
});
onBeforeUnmount(() => import.meta.client && window.removeEventListener('keydown', onSampleKey));

// ── On a model ──────────────────────────────────────────────────────────────────────────────────────────────

/** The chosen product's model photos that have their print area marked. */
const models = computed(() =>
  (product.value?.models ?? []).flatMap((m) => {
    const mesh = m.image ? parseMesh(m.area ?? '') : null;
    return mesh ? [{ ...m, mesh }] : [];
  }),
);
const modelOpen = ref<number | null>(null);
const modelBusy = ref(false);
const modelError = ref('');
const modelEl = ref<HTMLCanvasElement | null>(null);
/** Each photo is read once (keyed by photo, corners and mask). */
const modelCache = new Map<string, Promise<ModelPhoto>>();

function preparedModel(m: (typeof models.value)[number]): Promise<ModelPhoto> {
  const key = `${m.image}|${m.area}|${m.mask}`;
  let ready = modelCache.get(key);
  if (!ready) {
    ready = Promise.all([loadPhoto(m.image), m.mask ? loadPhoto(m.mask).catch(() => null) : null]).then(([photo, mask]) =>
      prepareModel(photo.img, photo.readable, m.mesh, mask?.img),
    );
    ready.catch(() => modelCache.delete(key));
    modelCache.set(key, ready);
  }
  return ready;
}

let modelRun = 0;
async function drawOnModel() {
  const i = modelOpen.value;
  const m = i === null ? undefined : models.value[i];
  if (!m) return;
  const run = ++modelRun;
  modelBusy.value = true;
  modelError.value = '';
  try {
    await document.fonts?.ready;
    const prepared = await preparedModel(m);
    if (run !== modelRun || !modelEl.value) return;
    // The design at about the size it covers on the photo, so it stays sharp without wasting time.
    const [pw, ph] = printPixels(printCm.value);
    const k = Math.min(1, 1200 / Math.max(pw, ph));
    const d = document.createElement('canvas');
    d.width = Math.max(1, Math.round(pw * k));
    d.height = Math.max(1, Math.round(ph * k));
    drawDesign(d.getContext('2d')!, design, d.width, d.height, images, new Map());
    renderOnModel(modelEl.value, prepared, d, base.value);
  } catch {
    if (run === modelRun) modelError.value = t.value.modelFailed;
  } finally {
    if (run === modelRun) modelBusy.value = false;
  }
}

async function downloadOnModel() {
  if (!modelEl.value) return;
  const url = URL.createObjectURL(await toBlob(modelEl.value, 'image/jpeg', 0.92));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${product.value?.name || 'design'}.jpg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const onModelKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') modelOpen.value = null;
};
watch(modelOpen, async (open) => {
  if (!import.meta.client) return;
  window.removeEventListener('keydown', onModelKey);
  if (open === null) return;
  window.addEventListener('keydown', onModelKey);
  await nextTick();
  drawOnModel();
});
watch(base, () => modelOpen.value !== null && drawOnModel());
watch(models, (list) => modelOpen.value !== null && modelOpen.value >= list.length && (modelOpen.value = null));
onBeforeUnmount(() => import.meta.client && window.removeEventListener('keydown', onModelKey));

/** Where the design is edited: mugs are edited unrolled, everything else on the product itself. */
const stage = computed(() =>
  surface.value.mug
    ? { ...surface.value, view: [1000, 494] as [number, number], area: [40, 40, 920, 414] as [number, number, number, number] }
    : surface.value,
);

// ── The design ──────────────────────────────────────────────────────────────────────────────────────────────

const design = reactive<Design>({ background: emptyBackground(), layers: [] });
const selectedId = ref<string | null>(null);
const selected = computed(() => design.layers.find((l) => l.id === selectedId.value) ?? null);
const images: ImageStore = new Map();
const textCache = new Map<string, HTMLCanvasElement>();
const notice = ref('');
let uid = 0;
const newId = () => `l${Date.now().toString(36)}${(uid++).toString(36)}`;

const photoCount = computed(() => design.layers.filter((l) => l.kind === 'image').length);
const photosFull = computed(() => maxPhotos.value > 0 && photoCount.value >= maxPhotos.value);

const hasContent = computed(() => design.layers.length > 0 || Boolean(design.background.color) || design.background.pattern !== 'none');

function quality(l: ImageLayer) {
  const dpi = photoDpi(l, printCm.value[0]);
  if (dpi >= 140) return { dpi, label: t.value.sharp, cls: 'bg-emerald-100 text-emerald-700' };
  if (dpi >= 90) return { dpi, label: t.value.good, cls: 'bg-amber-100 text-amber-700' };
  return { dpi, label: t.value.low, cls: 'bg-red-100 text-red-700' };
}

function addLayer(l: Layer) {
  if (design.layers.length >= 30) {
    notice.value = t.value.tooMany;
    return;
  }
  if (l.kind === 'image' && photosFull.value) {
    notice.value = fill(t.value.photoLimit, maxPhotos.value);
    return;
  }
  design.layers.push(l);
  selectedId.value = l.id;
  step.value = 'design';
  requestDraw();
  commit();
}

const layerDefaults = () => ({
  x: 0.5,
  y: 0.5,
  rot: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  repeat: 'none' as Repeat,
  gap: 0.1,
  shadow: false,
});

async function addFiles(files: FileList | File[] | null | undefined) {
  notice.value = '';
  for (const file of Array.from(files ?? [])) {
    if (photosFull.value) {
      notice.value = fill(t.value.photoLimit, maxPhotos.value);
      break;
    }
    if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) {
      notice.value = t.value.notImage;
      continue;
    }
    if (file.size > 40 * 1024 * 1024) {
      notice.value = t.value.tooBig;
      continue;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    try {
      await img.decode();
    } catch {
      notice.value = t.value.notImage;
      continue;
    }
    const imageId = newId();
    images.set(imageId, img);
    const [aw, ah] = stage.value.area.slice(2);
    // As large as fits, leaving a margin.
    const w = Math.min(0.8, (0.8 * (ah / aw) * img.naturalWidth) / img.naturalHeight);
    addLayer({
      ...layerDefaults(),
      id: newId(),
      kind: 'image',
      imageId,
      name: file.name.slice(0, 80),
      nw: img.naturalWidth,
      nh: img.naturalHeight,
      w,
      filter: 'none',
      mask: 'none',
    });
  }
}

function addText(text = t.value.newText, emoji = false) {
  const layer: TextLayer = {
    ...layerDefaults(),
    id: newId(),
    kind: 'text',
    text,
    font: fa.value ? fonts[0].css : fonts[5].css,
    color: '#111827',
    stroke: '#ffffff',
    strokeW: 0,
    bold: true,
    italic: false,
    curve: 0,
    w: emoji ? 0.2 : 0.09,
  };
  addLayer(layer);
  loadFont(layer.font);
}

function loadFont(css: string) {
  if (!import.meta.client || !document.fonts) return;
  Promise.all([document.fonts.load(`800 40px ${css}`, 'aبc'), document.fonts.load(`500 40px ${css}`, 'aبc')])
    .then(() => {
      textCache.clear();
      requestDraw();
    })
    .catch(() => undefined);
}

function removeLayer(id = selectedId.value) {
  design.layers = design.layers.filter((l) => l.id !== id);
  if (selectedId.value === id) selectedId.value = null;
  commit();
}

function duplicate() {
  const l = selected.value;
  if (!l) return;
  addLayer({ ...JSON.parse(JSON.stringify(l)), id: newId(), x: Math.min(0.95, l.x + 0.04), y: Math.min(0.95, l.y + 0.04) });
}

function move(delta: number) {
  const i = design.layers.findIndex((l) => l.id === selectedId.value);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= design.layers.length) return;
  const list = [...design.layers];
  [list[i], list[j]] = [list[j], list[i]];
  design.layers = list;
  commit();
}

/** Scales the selected photo so it covers the whole print area. */
function cover() {
  const l = selected.value;
  if (!l || l.kind !== 'image') return;
  const [aw, ah] = stage.value.area.slice(2);
  l.x = 0.5;
  l.y = 0.5;
  l.rot = 0;
  l.w = Math.max(1, ((ah / aw) * l.nw) / l.nh);
  commit();
}

function centerSelected() {
  if (!selected.value) return;
  selected.value.x = 0.5;
  selected.value.y = 0.5;
  commit();
}

function clearAll() {
  if (!confirm(t.value.clearConfirm)) return;
  design.layers = [];
  Object.assign(design.background, emptyBackground());
  selectedId.value = null;
  commit();
}

// ── Undo / redo ─────────────────────────────────────────────────────────────────────────────────────────────

const past = ref<string[]>([]);
const future = ref<string[]>([]);
let current = JSON.stringify(design);
let dragging = false;

function commit() {
  const now = JSON.stringify(design);
  if (now === current) return;
  past.value = [...past.value.slice(-59), current];
  future.value = [];
  current = now;
}

function apply(snapshot: string) {
  const d = JSON.parse(snapshot) as Design;
  design.layers = d.layers;
  Object.assign(design.background, d.background);
  current = snapshot;
  if (!design.layers.some((l) => l.id === selectedId.value)) selectedId.value = null;
}

function undo() {
  const prev = past.value.at(-1);
  if (prev === undefined) return;
  past.value = past.value.slice(0, -1);
  future.value = [...future.value, current];
  apply(prev);
}

function redo() {
  const next = future.value.at(-1);
  if (next === undefined) return;
  future.value = future.value.slice(0, -1);
  past.value = [...past.value, current];
  apply(next);
}

let commitTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  design,
  () => {
    requestDraw();
    clearTimeout(commitTimer);
    commitTimer = setTimeout(() => !dragging && commit(), 400);
  },
  { deep: true },
);
watch([base, productIndex], () => requestDraw());

// ── Drawing ─────────────────────────────────────────────────────────────────────────────────────────────────

const stageEl = ref<HTMLCanvasElement | null>(null);
const wrapEl = ref<HTMLDivElement | null>(null);
const insetEl = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
let designCanvas: HTMLCanvasElement | null = null;
let frame = 0;
let guides = { x: false, y: false };
const dpr = () => (import.meta.client ? Math.min(2, window.devicePixelRatio || 1) : 1);

function requestDraw() {
  if (!import.meta.client || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
}

/** Scale of the stage: device pixels per view unit. */
function stageScale() {
  const c = stageEl.value;
  return c ? c.width / stage.value.view[0] : 1;
}

function draw() {
  const c = stageEl.value;
  if (!c) return;
  const ctx = c.getContext('2d')!;
  const s = stageScale();
  const [ax, ay, aw, ah] = stage.value.area;
  designCanvas ??= document.createElement('canvas');
  const dw = Math.max(1, Math.round(aw * s));
  const dh = Math.max(1, Math.round(ah * s));
  if (designCanvas.width !== dw || designCanvas.height !== dh) {
    designCanvas.width = dw;
    designCanvas.height = dh;
  }
  if (textCache.size > 60) textCache.clear();
  drawDesign(designCanvas.getContext('2d')!, design, dw, dh, images, textCache);
  ctx.clearRect(0, 0, c.width, c.height);
  drawMockup(ctx, stage.value, base.value, designCanvas, s, true);

  // Selection box, handles and centre guides, in device pixels.
  const ratio = dpr();
  ctx.save();
  ctx.translate(ax * s, ay * s);
  if (guides.x || guides.y) {
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1 * ratio;
    ctx.setLineDash([6 * ratio, 4 * ratio]);
    ctx.beginPath();
    if (guides.x) {
      ctx.moveTo(dw / 2, 0);
      ctx.lineTo(dw / 2, dh);
    }
    if (guides.y) {
      ctx.moveTo(0, dh / 2);
      ctx.lineTo(dw, dh / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const l = selected.value;
  if (l) {
    const corners = layerCorners(l, dw, dh);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5 * ratio;
    ctx.beginPath();
    corners.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    ctx.closePath();
    ctx.stroke();
    const [rx, ry] = rotateHandle(l, dw, dh);
    const [tx, ty] = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2];
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [...corners, [rx, ry]]) {
      ctx.beginPath();
      ctx.arc(x, y, 7 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();

  const inset = insetEl.value;
  if (inset && surface.value.mug) {
    const ictx = inset.getContext('2d')!;
    ictx.clearRect(0, 0, inset.width, inset.height);
    drawMockup(ictx, surface.value, base.value, designCanvas, inset.width / surface.value.view[0]);
  }
}

/** The round handle above the layer that turns it. */
function rotateHandle(l: Layer, dw: number, dh: number): [number, number] {
  const corners = layerCorners(l, dw, dh);
  const a = (l.rot * Math.PI) / 180;
  const off = 28 * dpr();
  const tx = (corners[0][0] + corners[1][0]) / 2;
  const ty = (corners[0][1] + corners[1][1]) / 2;
  return [tx + Math.sin(a) * off, ty - Math.cos(a) * off];
}

function resize() {
  const c = stageEl.value;
  const wrap = wrapEl.value;
  if (!c || !wrap) return;
  const ratio = dpr();
  c.width = Math.round(wrap.clientWidth * ratio);
  c.height = Math.round((wrap.clientWidth * ratio * stage.value.view[1]) / stage.value.view[0]);
  if (insetEl.value) {
    insetEl.value.width = Math.round(120 * ratio);
    insetEl.value.height = Math.round((120 * ratio * surface.value.view[1]) / surface.value.view[0]);
  }
  draw();
}

watch(stage, () => nextTick(resize));

// ── Touch, mouse and keyboard ───────────────────────────────────────────────────────────────────────────────

type Gesture =
  | { mode: 'move'; id: string; px: number; py: number; x0: number; y0: number }
  | { mode: 'scale'; id: string; cx: number; cy: number; d0: number; w0: number }
  | { mode: 'rotate'; id: string; cx: number; cy: number; a0: number; r0: number }
  | { mode: 'pinch'; id: string; d0: number; a0: number; w0: number; r0: number; mx: number; my: number; x0: number; y0: number };

const pointers = new Map<number, { x: number; y: number }>();
let gesture: Gesture | null = null;

/** A pointer's position in design-area device pixels, and the area's size. */
function areaPoint(e: { clientX: number; clientY: number }) {
  const c = stageEl.value!;
  const rect = c.getBoundingClientRect();
  const s = stageScale();
  const [ax, ay, aw, ah] = stage.value.area;
  const ratio = c.width / rect.width;
  return { x: (e.clientX - rect.left) * ratio - ax * s, y: (e.clientY - rect.top) * ratio - ay * s, aw: aw * s, ah: ah * s };
}

function pinchState() {
  const [a, b] = [...pointers.values()];
  return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

function topLayerAt(x: number, y: number, aw: number, ah: number) {
  return [...design.layers].reverse().find((l) => hitLayer(l, x, y, aw, ah, 6 * dpr()));
}

function onPointerDown(e: PointerEvent) {
  const c = stageEl.value;
  if (!c) return;
  c.setPointerCapture(e.pointerId);
  const pt = areaPoint(e);
  pointers.set(e.pointerId, { x: pt.x, y: pt.y });
  dragging = true;

  if (pointers.size === 2) {
    const ps = pinchState();
    const l = selected.value ?? topLayerAt(ps.mx, ps.my, pt.aw, pt.ah);
    if (!l) return;
    selectedId.value = l.id;
    gesture = { mode: 'pinch', id: l.id, d0: ps.d, a0: ps.a, w0: l.w, r0: l.rot, mx: ps.mx, my: ps.my, x0: l.x, y0: l.y };
    return;
  }
  if (pointers.size > 2) return;

  const l = selected.value;
  if (l) {
    const corners = layerCorners(l, pt.aw, pt.ah);
    const reach = (e.pointerType === 'touch' ? 22 : 12) * dpr();
    const [rx, ry] = rotateHandle(l, pt.aw, pt.ah);
    const cx = l.x * pt.aw;
    const cy = l.y * pt.ah;
    if (Math.hypot(pt.x - rx, pt.y - ry) < reach) {
      gesture = { mode: 'rotate', id: l.id, cx, cy, a0: Math.atan2(pt.y - cy, pt.x - cx), r0: l.rot };
      return;
    }
    if (corners.some(([x, y]) => Math.hypot(pt.x - x, pt.y - y) < reach)) {
      gesture = { mode: 'scale', id: l.id, cx, cy, d0: Math.hypot(pt.x - cx, pt.y - cy), w0: l.w };
      return;
    }
  }
  const hit = topLayerAt(pt.x, pt.y, pt.aw, pt.ah);
  selectedId.value = hit?.id ?? null;
  if (hit) gesture = { mode: 'move', id: hit.id, px: pt.x, py: pt.y, x0: hit.x, y0: hit.y };
  else gesture = null;
  requestDraw();
}

const snapAngle = (deg: number) => {
  const r = ((deg % 360) + 360) % 360;
  const near = Math.round(r / 45) * 45;
  return Math.abs(r - near) < 4 ? near % 360 : r;
};

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  const pt = areaPoint(e);
  pointers.set(e.pointerId, { x: pt.x, y: pt.y });
  const g = gesture;
  const l = g && design.layers.find((x) => x.id === g.id);
  if (!g || !l) return;
  guides = { x: false, y: false };
  if (g.mode === 'move') {
    let x = g.x0 + (pt.x - g.px) / pt.aw;
    let y = g.y0 + (pt.y - g.py) / pt.ah;
    guides = { x: Math.abs(x - 0.5) < 0.012, y: Math.abs(y - 0.5) < 0.012 };
    if (guides.x) x = 0.5;
    if (guides.y) y = 0.5;
    l.x = Math.max(-0.5, Math.min(1.5, x));
    l.y = Math.max(-0.5, Math.min(1.5, y));
  } else if (g.mode === 'scale') {
    l.w = Math.max(0.01, Math.min(4, (g.w0 * Math.hypot(pt.x - g.cx, pt.y - g.cy)) / Math.max(1, g.d0)));
  } else if (g.mode === 'rotate') {
    l.rot = snapAngle(g.r0 + ((Math.atan2(pt.y - g.cy, pt.x - g.cx) - g.a0) * 180) / Math.PI);
  } else if (g.mode === 'pinch' && pointers.size >= 2) {
    const ps = pinchState();
    l.w = Math.max(0.01, Math.min(4, (g.w0 * ps.d) / Math.max(1, g.d0)));
    l.rot = snapAngle(g.r0 + ((ps.a - g.a0) * 180) / Math.PI);
    l.x = g.x0 + (ps.mx - g.mx) / pt.aw;
    l.y = g.y0 + (ps.my - g.my) / pt.ah;
  }
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId);
  // Lifting one finger of a pinch must not turn the other into a jumpy drag.
  if (pointers.size === 0 || gesture?.mode === 'pinch') gesture = null;
  if (pointers.size === 0) {
    dragging = false;
    guides = { x: false, y: false };
    commit();
    requestDraw();
  }
}

let wheelTimer: ReturnType<typeof setTimeout> | undefined;
function onWheel(e: WheelEvent) {
  const l = selected.value;
  if (!l) return;
  e.preventDefault();
  if (e.shiftKey || e.altKey) l.rot = snapAngle(l.rot + e.deltaY * 0.15);
  else l.w = Math.max(0.01, Math.min(4, l.w * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
  dragging = true;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    dragging = false;
    commit();
  }, 300);
}

function onKey(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'y') return (e.preventDefault(), redo());
  const l = selected.value;
  if (!l) return;
  if (mod && e.key.toLowerCase() === 'd') return (e.preventDefault(), duplicate());
  if (e.key === 'Delete' || e.key === 'Backspace') return (e.preventDefault(), removeLayer());
  if (e.key === 'Escape') return ((selectedId.value = null), requestDraw());
  const by = e.shiftKey ? 0.05 : 0.005;
  const moves: Record<string, [number, number]> = { ArrowLeft: [-by, 0], ArrowRight: [by, 0], ArrowUp: [0, -by], ArrowDown: [0, by] };
  const d = moves[e.key];
  if (d) {
    e.preventDefault();
    l.x += d[0];
    l.y += d[1];
  }
}

const dropping = ref(false);
function onDrop(e: DragEvent) {
  dropping.value = false;
  addFiles(e.dataTransfer?.files);
}

function onPaste(e: ClipboardEvent) {
  const files = [...(e.clipboardData?.items ?? [])]
    .filter((i) => i.kind === 'file')
    .map((i) => i.getAsFile()!)
    .filter(Boolean);
  if (files.length) {
    e.preventDefault();
    addFiles(files);
  }
}

let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(resize);
  if (wrapEl.value) observer.observe(wrapEl.value);
  stageEl.value?.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('paste', onPaste);
  document.fonts?.ready.then(requestDraw);
  startedAt.value = Date.now();
  resize();
  loadMine();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('paste', onPaste);
  cancelAnimationFrame(frame);
  for (const img of images.values()) URL.revokeObjectURL(img.src);
  for (const url of Object.values(myPreviews)) URL.revokeObjectURL(url);
});

// ── Sending ─────────────────────────────────────────────────────────────────────────────────────────────────

type Step = 'product' | 'design' | 'send' | 'mine';
const step = ref<Step>('product');
const steps = computed<Step[]>(() => (showMine.value ? ['product', 'design', 'send', 'mine'] : ['product', 'design', 'send']));
const contact = reactive({ name: '', phone: '', email: '', notes: '' });
const website = ref('');
const startedAt = ref(0);
const sending = ref('');
const sent = ref('');
const errors = ref<string[]>([]);
const previewUrl = ref('');

// ── The visitor's own designs ───────────────────────────────────────────────────────────────────────────────

interface MyDesign {
  id: string;
  product: string;
  size: string;
  quantity: number;
  color: string;
  status: 'new' | 'called' | 'production' | 'done' | 'cancelled';
  createdAt: string;
}

const VISITOR_KEY = 'pt_designer_key';
let memoryKey = '';
/**
 * A random key this browser keeps for the site, sent with each design: the API stores only its hash, and gives the
 * designs back to whoever shows the key. No account, nothing personal in it.
 */
function visitorKey(): string {
  try {
    const kept = localStorage.getItem(VISITOR_KEY);
    if (kept && /^[A-Za-z0-9_-]{32,64}$/.test(kept)) return kept;
  } catch {
    // Storage blocked (private window): the key lasts as long as the page.
  }
  if (!memoryKey) memoryKey = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
  try {
    localStorage.setItem(VISITOR_KEY, memoryKey);
  } catch {
    // As above.
  }
  return memoryKey;
}

const myDesigns = ref<MyDesign[]>([]);
const myPreviews = reactive<Record<string, string>>({});
const used = ref(0);
const limitReached = computed(() => maxDesigns.value > 0 && used.value >= maxDesigns.value);
const statusClass: Record<MyDesign['status'], string> = {
  new: 'bg-slate-100 text-slate-700',
  called: 'bg-sky-100 text-sky-700',
  production: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

async function loadMine() {
  if (!props.data || editing) return;
  const headers = { 'x-visitor-key': visitorKey() };
  try {
    const res = await api<{ used: number; designs: MyDesign[] }>(`/public/designs/${props.data.pageId}/${props.data.blockId}/mine`, {
      query: { locale: props.locale },
      headers,
    });
    used.value = res.used;
    myDesigns.value = res.designs;
    // Previews come with the key in a header, so they are fetched rather than linked.
    for (const d of res.designs) {
      if (myPreviews[d.id]) continue;
      api<Blob>(`/public/designs/mine/${d.id}/preview`, { headers, responseType: 'blob' })
        .then((blob) => (myPreviews[d.id] = URL.createObjectURL(blob)))
        .catch(() => undefined);
    }
  } catch {
    // Not critical: the tab just stays empty.
  }
}

function showMyDesigns() {
  again();
  step.value = 'mine';
}

function toBlob(c: HTMLCanvasElement, type: string, q?: number) {
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, q));
}

/** The print file: PNG (no ink where the design is empty) unless that is too big to send, then JPEG on white. */
async function printFile(): Promise<{ blob: Blob; px: [number, number] }> {
  const LIMIT = 21 * 1024 * 1024;
  let [w, h] = printPixels(printCm.value);
  for (let attempt = 0; attempt < 4; attempt++) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawDesign(c.getContext('2d')!, design, w, h, images, new Map());
    const png = await toBlob(c, 'image/png');
    if (png.size <= LIMIT) return { blob: png, px: [w, h] };
    const flat = document.createElement('canvas');
    flat.width = w;
    flat.height = h;
    const fctx = flat.getContext('2d')!;
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(c, 0, 0);
    const jpg = await toBlob(flat, 'image/jpeg', 0.92);
    if (jpg.size <= LIMIT) return { blob: jpg, px: [w, h] };
    w = Math.round(w * 0.8);
    h = Math.round(h * 0.8);
  }
  throw new Error('too large');
}

/** The product with the design on it, as the admin first sees it. */
async function previewFile(): Promise<Blob> {
  const sf = surface.value;
  const scale = 1200 / sf.view[0];
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = Math.round(sf.view[1] * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, c.width, c.height);
  const d = document.createElement('canvas');
  // Mugs show half the wrap, so their print is drawn at twice the cup's width to stay sharp.
  d.width = Math.round(sf.area[2] * scale * (sf.mug ? 2 : 1));
  d.height = Math.round(sf.area[3] * scale * (sf.mug ? 2 : 1));
  drawDesign(d.getContext('2d')!, design, d.width, d.height, images, new Map());
  drawMockup(ctx, sf, base.value, d, scale);
  return toBlob(c, 'image/jpeg', 0.9);
}

function summary() {
  const fontName = (css: string) => fonts.find((f) => f.css === css)?.label ?? css;
  const layers = design.layers.map((l) => {
    const rep = l.repeat !== 'none' ? `, repeated (${l.repeat})` : '';
    if (l.kind === 'image')
      return `Photo: ${l.name} — ${photoDpi(l, printCm.value[0])} dpi${l.filter !== 'none' ? `, ${l.filter}` : ''}${rep}`;
    return `Text: “${l.text}” — ${fontName(l.font)}, ${l.color}${l.strokeW ? `, outline ${l.stroke}` : ''}${rep}`;
  });
  const bg = design.background;
  return {
    layers,
    background: `${bg.color || 'no ink'}${bg.pattern !== 'none' ? ` + ${bg.pattern} ${bg.color2}` : ''}`,
  };
}

async function submit() {
  errors.value = [];
  if (!contact.name.trim()) errors.value.push(t.value.needName);
  if (contact.phone.replace(/\D/g, '').length < 5 && !/[۰-۹]{5}/.test(contact.phone)) errors.value.push(t.value.needPhone);
  if (!hasContent.value) errors.value.push(t.value.empty);
  if (errors.value.length || !props.data || editing || limitReached.value) return;
  const realIndex = (props.p.products ?? []).indexOf(product.value);
  try {
    sending.value = t.value.preparing;
    await document.fonts?.ready;
    selectedId.value = null;
    const [print, preview] = [await printFile(), await previewFile()];
    sending.value = t.value.sending;
    const form = new FormData();
    form.set('locale', props.locale);
    form.set(
      'data',
      JSON.stringify({
        product: realIndex,
        color: colors.value.length ? color.value : '',
        material: material.value,
        size: size.value,
        quantity: quantity.value,
        ...contact,
        printPx: print.px,
        ...summary(),
      }),
    );
    form.set('website', website.value);
    form.set('startedAt', String(startedAt.value));
    form.set('preview', preview, 'preview.jpg');
    form.set('print', print.blob, print.blob.type === 'image/png' ? 'print.png' : 'print.jpg');
    const res = await api<{ ok: boolean; message?: string }>(`/public/designs/${props.data.pageId}/${props.data.blockId}`, {
      method: 'POST',
      body: form,
      timeout: 180000,
      headers: { 'x-visitor-key': visitorKey() },
    });
    previewUrl.value = URL.createObjectURL(preview);
    sent.value = res.message || props.p.successMessage;
    loadMine();
  } catch (err) {
    const data = (err as { data?: { message?: string | string[]; errors?: string[]; limit?: number } }).data;
    if (data?.limit) used.value = data.limit;
    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    errors.value = data?.errors?.length ? data.errors : [message ?? t.value.failed];
  } finally {
    sending.value = '';
  }
}

function again() {
  sent.value = '';
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  step.value = 'design';
  nextTick(resize);
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-primary)_15%,transparent)]';
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`;
const range = 'w-full accent-[var(--c-primary)]';
const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 disabled:opacity-40';
const stageStyle = computed(() => {
  const [w, h] = stage.value.view;
  return { aspectRatio: `${w} / ${h}`, maxWidth: `calc(70vh * ${w / h})` };
});
const layerLabel = (l: Layer) => (l.kind === 'image' ? l.name || t.value.photo : l.text.split('\n')[0] || t.value.text);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel px-4 py-8 @3xl:px-12 @3xl:py-12">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-2xl font-black @3xl:text-4xl"><EditableText :value="p.title" path="title" /></h2>
        <p v-if="p.text || editing" class="mt-3 font-extralight text-muted @3xl:text-lg">
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>

      <Transition enter-active-class="transition-all duration-700" enter-from-class="opacity-0 translate-y-3">
        <div v-if="sent" key="sent" class="mx-auto mt-10 flex max-w-xl flex-col items-center gap-5 text-center" role="status">
          <img v-if="previewUrl" :src="previewUrl" alt="" class="w-full max-w-sm rounded-[2rem] bg-slate-50 shadow-lg" />
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-white"
            ><i class="mdi mdi-check"
          /></span>
          <p class="text-lg font-medium">{{ sent }}</p>
          <button type="button" class="btn-pill border border-slate-200 bg-white hover:border-slate-400" @click="again">
            <i class="mdi mdi-palette-outline" /> {{ t.again }}
          </button>
          <button
            v-if="showMine && data"
            type="button"
            class="text-sm text-primary underline-offset-2 hover:underline"
            @click="showMyDesigns"
          >
            <i class="mdi mdi-folder-image" /> {{ t.seeMine }}
          </button>
        </div>
      </Transition>
      <div v-show="!sent" class="mt-8 grid gap-6 @3xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] @3xl:gap-10">
        <!-- The stage: the product with the design, edited directly. -->
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" :class="iconBtn" :disabled="!past.length" :title="t.undo" :aria-label="t.undo" @click="undo">
              <i class="mdi mdi-undo rtl:-scale-x-100" />
            </button>
            <button type="button" :class="iconBtn" :disabled="!future.length" :title="t.redo" :aria-label="t.redo" @click="redo">
              <i class="mdi mdi-redo rtl:-scale-x-100" />
            </button>
            <span class="mx-1 h-5 w-px bg-slate-200" />
            <button type="button" :class="iconBtn" :title="t.addPhoto" :aria-label="t.addPhoto" @click="fileInput?.click()">
              <i class="mdi mdi-image-plus-outline" />
            </button>
            <button type="button" :class="iconBtn" :title="t.addText" :aria-label="t.addText" @click="addText()">
              <i class="mdi mdi-format-text" />
            </button>
            <template v-if="selected">
              <span class="mx-1 h-5 w-px bg-slate-200" />
              <button type="button" :class="iconBtn" :title="t.duplicate" :aria-label="t.duplicate" @click="duplicate">
                <i class="mdi mdi-content-copy" />
              </button>
              <button type="button" :class="iconBtn" :title="t.forward" :aria-label="t.forward" @click="move(1)">
                <i class="mdi mdi-arrange-bring-forward" />
              </button>
              <button type="button" :class="iconBtn" :title="t.backward" :aria-label="t.backward" @click="move(-1)">
                <i class="mdi mdi-arrange-send-backward" />
              </button>
              <button
                type="button"
                :class="[iconBtn, 'hover:!text-red-600']"
                :title="t.remove"
                :aria-label="t.remove"
                @click="removeLayer()"
              >
                <i class="mdi mdi-trash-can-outline" />
              </button>
            </template>
            <button
              v-if="models.length"
              type="button"
              class="btn-pill border border-slate-200 bg-white !px-3 !py-1.5 text-xs hover:border-slate-400"
              @click="modelOpen = 0"
            >
              <i class="mdi mdi-human-handsdown" /> {{ t.onModel }}
            </button>
            <button v-if="hasContent" type="button" class="ms-auto text-xs text-muted underline-offset-2 hover:underline" @click="clearAll">
              {{ t.clear }}
            </button>
          </div>

          <div
            ref="wrapEl"
            class="relative mx-auto w-full overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,#ffffff,#eef2f7)] ring-1 ring-slate-200 transition"
            :class="dropping ? 'ring-4 ring-primary' : ''"
            :style="stageStyle"
            @dragover.prevent="dropping = true"
            @dragleave="dropping = false"
            @drop.prevent="onDrop"
          >
            <canvas
              ref="stageEl"
              class="absolute inset-0 h-full w-full cursor-grab touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:cursor-grabbing"
              tabindex="0"
              role="application"
              :aria-label="t.hint"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @keydown="onKey"
            />
            <div
              v-if="!design.layers.length"
              class="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl bg-white/85 px-4 py-2 text-center text-xs text-slate-600 shadow-sm backdrop-blur"
            >
              {{ t.hint }}
            </div>
          </div>
          <div v-if="surface.mug" class="mt-3 flex items-center justify-center gap-3">
            <canvas ref="insetEl" class="w-[120px] shrink-0 rounded-2xl bg-slate-50" aria-hidden="true" />
            <p class="max-w-xs text-xs text-muted">{{ t.mugHint }}</p>
          </div>
          <p v-if="notice" class="mt-2 text-center text-sm text-red-600" role="alert">{{ notice }}</p>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            multiple
            class="hidden"
            @change="
              addFiles(($event.target as HTMLInputElement).files);
              ($event.target as HTMLInputElement).value = '';
            "
          />
        </div>

        <!-- The panel: one step at a time. -->
        <div class="min-w-0">
          <div class="flex rounded-full bg-slate-100 p-1 text-sm" role="tablist">
            <button
              v-for="(s, i) in steps"
              :key="s"
              type="button"
              role="tab"
              :aria-selected="step === s"
              class="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 transition"
              :class="step === s ? 'bg-white font-bold shadow-sm' : 'text-slate-500'"
              @click="step = s"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                :class="step === s ? 'bg-primary text-white' : 'bg-slate-200'"
                >{{
                  s === 'mine' ? (fa ? myDesigns.length.toLocaleString('fa') : myDesigns.length) : fa ? (i + 1).toLocaleString('fa') : i + 1
                }}</span
              >
              {{ t[s] }}
            </button>
          </div>

          <!-- 1 · Product -->
          <div v-if="step === 'product'" class="mt-5 space-y-6">
            <div class="grid grid-cols-3 gap-2 @xl:grid-cols-4">
              <button
                v-for="(pr, i) in products"
                :key="i"
                type="button"
                class="group flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition"
                :class="
                  productIndex === i
                    ? 'border-primary bg-[color-mix(in_srgb,var(--c-primary)_8%,white)] ring-2 ring-primary'
                    : 'border-slate-200 hover:border-slate-400'
                "
                :aria-pressed="productIndex === i"
                @click="productIndex = i"
              >
                <svg
                  :viewBox="`0 0 ${surfaces[pr.surface].view.join(' ')}`"
                  class="h-14 w-full transition group-hover:scale-105"
                  aria-hidden="true"
                >
                  <path
                    v-for="(st, j) in surfaces[pr.surface].straps ?? []"
                    :key="j"
                    :d="st"
                    fill="none"
                    stroke="#94a3b8"
                    stroke-width="36"
                    stroke-linecap="round"
                  />
                  <path :d="surfaces[pr.surface].body" :fill="base" stroke="#64748b" stroke-width="18" />
                </svg>
                <span class="text-xs font-medium leading-tight">{{ pr.name }}</span>
                <span v-if="pr.price" class="text-[11px] text-muted">{{ pr.price }}</span>
              </button>
            </div>

            <div v-if="samples.length">
              <p class="mb-2 text-sm font-medium">{{ t.samples }}</p>
              <div class="-mx-1 flex snap-x items-start gap-2 overflow-x-auto px-1 pb-1">
                <button
                  v-for="(s, i) in samples"
                  :key="`${productIndex}-${i}`"
                  type="button"
                  class="w-24 shrink-0 snap-start text-start @xl:w-28"
                  @click="sampleOpen = i"
                >
                  <img
                    :src="s.image"
                    :alt="s.caption || product?.name"
                    loading="lazy"
                    class="aspect-square w-full rounded-xl border border-slate-200 object-cover transition hover:scale-[1.03]"
                  />
                  <span v-if="s.caption" class="mt-1 line-clamp-2 block text-[11px] leading-tight text-muted">{{ s.caption }}</span>
                </button>
              </div>
            </div>

            <div v-if="colors.length">
              <p class="mb-2 text-sm font-medium">{{ t.baseColor }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in colors"
                  :key="c"
                  type="button"
                  class="h-9 w-9 rounded-full border border-slate-300 shadow-inner transition hover:scale-110"
                  :class="color === c ? 'ring-4 ring-primary ring-offset-2' : ''"
                  :style="{ background: c }"
                  :title="c"
                  :aria-label="c"
                  :aria-pressed="color === c"
                  @click="color = c"
                />
              </div>
            </div>

            <div v-if="materials.length">
              <p class="mb-2 text-sm font-medium">{{ t.fabric }}</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="m in materials" :key="m" type="button" :class="chip(material === m)" @click="material = m">{{ m }}</button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div v-if="sizes.length">
                <p class="mb-2 text-sm font-medium">{{ t.size }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="s in sizes" :key="s" type="button" :class="chip(size === s)" @click="size = s">{{ s }}</button>
                </div>
              </div>
              <div>
                <p class="mb-2 text-sm font-medium">{{ t.quantity }}</p>
                <div class="flex w-fit items-center rounded-full border border-slate-200 bg-white">
                  <button type="button" class="px-3 py-2" :aria-label="'-'" @click="quantity = Math.max(1, quantity - 1)">
                    <i class="mdi mdi-minus" />
                  </button>
                  <input
                    v-model.number="quantity"
                    type="number"
                    min="1"
                    :max="maxQuantity"
                    class="w-14 bg-transparent text-center outline-none"
                    dir="ltr"
                    @change="quantity = Math.min(maxQuantity, Math.max(1, Math.round(quantity) || 1))"
                  />
                  <button type="button" class="px-3 py-2" :aria-label="'+'" @click="quantity = Math.min(maxQuantity, quantity + 1)">
                    <i class="mdi mdi-plus" />
                  </button>
                </div>
              </div>
            </div>

            <p class="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-muted">
              <i class="mdi mdi-information-outline" /> {{ t.printArea }}: <span dir="ltr">{{ printCm[0] }} × {{ printCm[1] }} cm</span>.
              {{ t.tip }}
            </p>
            <button type="button" class="btn-pill w-full bg-primary text-white hover:brightness-110" @click="step = 'design'">
              {{ t.next }} <i class="mdi mdi-arrow-right rtl:-scale-x-100" />
            </button>
          </div>

          <!-- 2 · Design -->
          <div v-else-if="step === 'design'" class="mt-5 space-y-5">
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="btn-pill bg-primary text-white hover:brightness-110" @click="fileInput?.click()">
                <i class="mdi mdi-image-plus-outline" /> {{ t.addPhoto }}
                <span v-if="maxPhotos" class="text-xs opacity-80" dir="ltr">{{ photoCount }}/{{ maxPhotos }}</span>
              </button>
              <button type="button" class="btn-pill border border-slate-200 bg-white hover:border-slate-400" @click="addText()">
                <i class="mdi mdi-format-text" /> {{ t.addText }}
              </button>
            </div>

            <!-- The selected layer -->
            <div v-if="selected" class="space-y-4 rounded-3xl border border-slate-200 p-4">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-sm font-bold">
                  <i class="mdi" :class="selected.kind === 'image' ? 'mdi-image-outline' : 'mdi-format-text'" /> {{ layerLabel(selected) }}
                </p>
                <span
                  v-if="selected.kind === 'image'"
                  class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="quality(selected).cls"
                >
                  {{ quality(selected).label }} · <span dir="ltr">{{ quality(selected).dpi }} dpi</span>
                </span>
              </div>

              <template v-if="selected.kind === 'text'">
                <textarea v-model="selected.text" rows="2" :class="inputClass" :dir="fa ? 'rtl' : 'auto'" />
                <div class="grid grid-cols-2 gap-3">
                  <label class="text-xs text-muted">
                    {{ t.font }}
                    <select
                      v-model="selected.font"
                      class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
                      @change="loadFont(selected.font)"
                    >
                      <option v-for="f in fonts" :key="f.css" :value="f.css" :style="{ fontFamily: f.css }">{{ f.label }}</option>
                    </select>
                  </label>
                  <div class="flex items-end gap-2">
                    <label class="flex flex-col items-center text-xs text-muted">
                      {{ t.color }}
                      <input
                        v-model="selected.color"
                        type="color"
                        class="mt-1 h-9 w-11 cursor-pointer rounded-lg border border-slate-200"
                      />
                    </label>
                    <button type="button" :class="chip(selected.bold)" :title="t.bold" @click="selected.bold = !selected.bold">
                      <i class="mdi mdi-format-bold" />
                    </button>
                    <button type="button" :class="chip(selected.italic)" :title="t.italic" @click="selected.italic = !selected.italic">
                      <i class="mdi mdi-format-italic" />
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                  <input
                    v-model="selected.stroke"
                    type="color"
                    class="h-8 w-10 cursor-pointer rounded-lg border border-slate-200"
                    :title="t.outline"
                  />
                  <label class="text-xs text-muted">
                    {{ t.outline }}
                    <input v-model.number="selected.strokeW" type="range" min="0" max="0.15" step="0.005" :class="range" />
                  </label>
                </div>
                <label v-if="!selected.text.includes('\n')" class="block text-xs text-muted">
                  {{ t.curve }}
                  <input
                    v-model.number="selected.curve"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.02"
                    :class="range"
                    @dblclick="selected.curve = 0"
                  />
                </label>
              </template>

              <template v-else>
                <div>
                  <p class="mb-1.5 text-xs text-muted">{{ t.filter }}</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="(_, f) in filters"
                      :key="f"
                      type="button"
                      :class="chip(selected.filter === f)"
                      @click="selected.filter = f"
                    >
                      {{ name(filterNames[f]) }}
                    </button>
                  </div>
                </div>
                <div>
                  <p class="mb-1.5 text-xs text-muted">{{ t.shape }}</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="(pair, m) in maskNames"
                      :key="m"
                      type="button"
                      :class="chip(selected.mask === m)"
                      @click="selected.mask = m"
                    >
                      {{ name(pair) }}
                    </button>
                  </div>
                </div>
                <button type="button" class="text-sm text-primary underline-offset-2 hover:underline" @click="cover">
                  <i class="mdi mdi-arrow-expand-all" /> {{ t.fill }}
                </button>
              </template>

              <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                <label class="text-xs text-muted">
                  {{ t.scale }}
                  <input v-model.number="selected.w" type="range" min="0.02" max="2" step="0.005" :class="range" />
                </label>
                <label class="text-xs text-muted">
                  {{ t.rotate }} <span dir="ltr">{{ Math.round(selected.rot) }}°</span>
                  <input v-model.number="selected.rot" type="range" min="0" max="360" step="1" :class="range" />
                </label>
                <label class="text-xs text-muted">
                  {{ t.opacity }}
                  <input v-model.number="selected.opacity" type="range" min="0.1" max="1" step="0.01" :class="range" />
                </label>
                <div class="flex items-end gap-1.5">
                  <button
                    type="button"
                    :class="chip(selected.flipX)"
                    :title="t.flipH"
                    :aria-label="t.flipH"
                    @click="selected.flipX = !selected.flipX"
                  >
                    <i class="mdi mdi-flip-horizontal" />
                  </button>
                  <button
                    type="button"
                    :class="chip(selected.flipY)"
                    :title="t.flipV"
                    :aria-label="t.flipV"
                    @click="selected.flipY = !selected.flipY"
                  >
                    <i class="mdi mdi-flip-vertical" />
                  </button>
                  <button
                    type="button"
                    :class="chip(selected.shadow)"
                    :title="t.shadow"
                    :aria-label="t.shadow"
                    @click="selected.shadow = !selected.shadow"
                  >
                    <i class="mdi mdi-box-shadow" />
                  </button>
                  <button type="button" :class="chip(false)" :title="t.center" :aria-label="t.center" @click="centerSelected">
                    <i class="mdi mdi-image-filter-center-focus" />
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-1.5 text-xs text-muted"><i class="mdi mdi-view-grid-outline" /> {{ t.repeat }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="(pair, r) in repeatNames"
                    :key="r"
                    type="button"
                    :class="chip(selected.repeat === r)"
                    @click="selected.repeat = r"
                  >
                    {{ name(pair) }}
                  </button>
                </div>
                <label v-if="selected.repeat !== 'none'" class="mt-2 block text-xs text-muted">
                  {{ t.spacing }}
                  <input v-model.number="selected.gap" type="range" min="0" max="1.5" step="0.01" :class="range" />
                </label>
              </div>
            </div>
            <p v-else-if="design.layers.length" class="text-center text-xs text-muted">{{ t.selectHint }}</p>

            <!-- Stickers -->
            <div>
              <p class="mb-2 text-sm font-medium">{{ t.stickers }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="s in stickers"
                  :key="s"
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl transition hover:-translate-y-0.5 hover:border-slate-400"
                  @click="addText(s, true)"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <!-- Background -->
            <div>
              <p class="mb-2 text-sm font-medium">{{ t.background }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" :class="chip(!design.background.color)" @click="design.background.color = ''">{{ t.noInk }}</button>
                <input
                  type="color"
                  :value="design.background.color || '#ffffff'"
                  class="h-9 w-11 cursor-pointer rounded-lg border border-slate-200"
                  :aria-label="t.background"
                  @input="design.background.color = ($event.target as HTMLInputElement).value"
                />
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                  v-for="(pair, pt) in patternNames"
                  :key="pt"
                  type="button"
                  :class="chip(design.background.pattern === pt)"
                  @click="design.background.pattern = pt"
                >
                  {{ name(pair) }}
                </button>
              </div>
              <div v-if="design.background.pattern !== 'none'" class="mt-3 grid grid-cols-[auto_1fr] items-center gap-3">
                <input
                  v-model="design.background.color2"
                  type="color"
                  class="h-9 w-11 cursor-pointer rounded-lg border border-slate-200"
                  :title="t.patternColor"
                />
                <label v-if="design.background.pattern !== 'gradient'" class="text-xs text-muted">
                  {{ t.patternSize }}
                  <input v-model.number="design.background.scale" type="range" min="0.02" max="0.3" step="0.005" :class="range" />
                </label>
              </div>
            </div>

            <!-- Layers -->
            <div v-if="design.layers.length">
              <p class="mb-2 text-sm font-medium">{{ t.layers }}</p>
              <ul class="space-y-1">
                <li v-for="l in [...design.layers].reverse()" :key="l.id">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm transition"
                    :class="l.id === selectedId ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100'"
                    @click="((selectedId = l.id), requestDraw())"
                  >
                    <i class="mdi" :class="l.kind === 'image' ? 'mdi-image-outline' : 'mdi-format-text'" />
                    <span class="min-w-0 flex-1 truncate">{{ layerLabel(l) }}</span>
                    <i v-if="l.repeat !== 'none'" class="mdi mdi-view-grid-outline opacity-60" />
                    <i v-if="l.kind === 'image' && quality(l).dpi < 90" class="mdi mdi-alert-outline text-amber-500" :title="t.low" />
                  </button>
                </li>
              </ul>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="btn-pill border border-slate-200 bg-white hover:border-slate-400" @click="step = 'product'">
                <i class="mdi mdi-arrow-left rtl:-scale-x-100" /> {{ t.back }}
              </button>
              <button type="button" class="btn-pill bg-primary text-white hover:brightness-110" @click="step = 'send'">
                {{ t.next }} <i class="mdi mdi-arrow-right rtl:-scale-x-100" />
              </button>
            </div>
          </div>

          <!-- 3 · Send -->
          <form v-else-if="step === 'send'" class="mt-5 space-y-4" novalidate @submit.prevent="submit">
            <button
              v-if="models.length"
              type="button"
              class="btn-pill w-full border border-slate-200 bg-white hover:border-slate-400"
              @click="modelOpen = 0"
            >
              <i class="mdi mdi-human-handsdown" /> {{ t.seeOnModel }}
            </button>
            <div class="rounded-3xl bg-slate-50 p-4 text-sm">
              <p class="mb-2 font-bold">{{ t.summary }}</p>
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt class="text-muted">{{ t.product }}</dt>
                <dd>
                  {{ product?.name }}<template v-if="product?.price"> · {{ product.price }}</template>
                </dd>
                <template v-if="color">
                  <dt class="text-muted">{{ t.baseColor }}</dt>
                  <dd class="flex items-center gap-2">
                    <span class="inline-block h-4 w-4 rounded-full border border-slate-300" :style="{ background: color }" /><span
                      dir="ltr"
                      >{{ color }}</span
                    >
                  </dd>
                </template>
                <template v-if="material">
                  <dt class="text-muted">{{ t.fabric }}</dt>
                  <dd>{{ material }}</dd>
                </template>
                <template v-if="size">
                  <dt class="text-muted">{{ t.size }}</dt>
                  <dd>{{ size }}</dd>
                </template>
                <dt class="text-muted">{{ t.quantity }}</dt>
                <dd>{{ fa ? quantity.toLocaleString('fa') : quantity }}</dd>
              </dl>
            </div>

            <input
              v-model="contact.name"
              type="text"
              :placeholder="t.name"
              :aria-label="t.name"
              autocomplete="name"
              required
              :class="inputClass"
            />
            <input
              v-model="contact.phone"
              type="tel"
              :placeholder="t.phone"
              :aria-label="t.phone"
              autocomplete="tel"
              dir="ltr"
              required
              :class="[inputClass, { 'text-end': fa }]"
            />
            <input
              v-model="contact.email"
              type="email"
              :placeholder="t.email"
              :aria-label="t.email"
              autocomplete="email"
              dir="ltr"
              :class="[inputClass, { 'text-end': fa }]"
            />
            <textarea v-model="contact.notes" rows="3" :placeholder="t.notes" :aria-label="t.notes" :class="inputClass" />

            <!-- Hidden from people; bots that fill it in are ignored. -->
            <div class="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <label>Website <input v-model="website" type="text" tabindex="-1" autocomplete="off" /></label>
            </div>

            <ul v-if="errors.length" class="space-y-1 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              <li v-for="e in errors" :key="e">{{ e }}</li>
            </ul>
            <p v-if="limitReached" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              <i class="mdi mdi-information-outline" /> {{ fill(t.limitReached, maxDesigns) }}
            </p>
            <p v-else-if="maxDesigns && used" class="text-xs text-muted">{{ fill(t.remaining, maxDesigns - used) }}</p>

            <div class="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                class="btn-pill border border-slate-200 bg-white hover:border-slate-400"
                :aria-label="t.back"
                @click="step = 'design'"
              >
                <i class="mdi mdi-arrow-left rtl:-scale-x-100" />
              </button>
              <button
                type="submit"
                class="btn-pill bg-primary text-white hover:shadow-lg hover:brightness-110 disabled:opacity-60"
                :disabled="Boolean(sending) || editing || !data || limitReached"
              >
                <template v-if="sending">{{ sending }} <i class="mdi mdi-loading mdi-spin" /></template>
                <template v-else
                  ><EditableText :value="p.submitLabel" path="submitLabel" /> <i class="mdi mdi-send rtl:-scale-x-100"
                /></template>
              </button>
            </div>
            <p v-if="editing" class="text-xs text-muted" dir="ltr">{{ $t('Designs can be sent from the published page.') }}</p>
          </form>

          <!-- 4 · My designs -->
          <div v-else class="mt-5 space-y-3">
            <p v-if="maxDesigns" class="text-xs text-muted">
              {{ limitReached ? fill(t.limitReached, maxDesigns) : fill(t.remaining, maxDesigns - used) }}
            </p>
            <p
              v-if="!myDesigns.length"
              class="rounded-3xl border-2 border-dashed border-slate-200 px-6 py-10 text-center text-sm text-muted"
            >
              <i class="mdi mdi-folder-image-outline mb-2 block text-3xl" />
              {{ t.noDesigns }}
            </p>
            <ul v-else class="grid grid-cols-2 gap-3">
              <li v-for="d in myDesigns" :key="d.id" class="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div class="aspect-square bg-slate-50">
                  <img v-if="myPreviews[d.id]" :src="myPreviews[d.id]" :alt="d.product" class="h-full w-full object-contain" />
                </div>
                <div class="space-y-1 p-3 text-sm">
                  <p class="truncate font-bold">
                    {{ d.product }}<template v-if="d.size"> · {{ d.size }}</template> ×
                    {{ fa ? d.quantity.toLocaleString('fa') : d.quantity }}
                  </p>
                  <p class="text-xs text-muted">{{ new Date(d.createdAt).toLocaleDateString(fa ? 'fa-IR' : 'en-GB') }}</p>
                  <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium" :class="statusClass[d.status]">{{
                    t[`s_${d.status}`]
                  }}</span>
                </div>
              </li>
            </ul>
            <button
              v-if="!limitReached"
              type="button"
              class="btn-pill w-full border border-slate-200 bg-white hover:border-slate-400"
              @click="step = 'design'"
            >
              <i class="mdi mdi-plus" /> {{ t.newDesign }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="modelOpen !== null && models[modelOpen]"
        class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="t.onModel"
        :dir="fa ? 'rtl' : 'ltr'"
        @click.self="modelOpen = null"
      >
        <div class="relative flex min-h-0 w-full flex-1 items-center justify-center" @click.self="modelOpen = null">
          <canvas
            ref="modelEl"
            class="max-h-full max-w-full rounded-2xl bg-slate-800 object-contain shadow-2xl transition-opacity"
            :class="modelBusy ? 'opacity-60' : ''"
            data-on-model
          />
          <i v-if="modelBusy" class="mdi mdi-loading absolute animate-spin text-4xl text-white" />
          <p v-if="modelError" class="absolute rounded-xl bg-white px-4 py-2 text-sm text-red-600">{{ modelError }}</p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <template v-if="models.length > 1">
            <button
              v-for="(m, i) in models"
              :key="i"
              type="button"
              class="h-14 w-14 overflow-hidden rounded-xl border-2 transition"
              :class="modelOpen === i ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'"
              :aria-label="m.label || `${t.onModel} ${i + 1}`"
              :aria-pressed="modelOpen === i"
              @click="modelOpen = i"
            >
              <img :src="m.image" alt="" class="h-full w-full object-cover" />
            </button>
          </template>
          <button
            type="button"
            class="btn-pill bg-white text-sm text-slate-900"
            :disabled="modelBusy || !!modelError"
            @click="downloadOnModel"
          >
            <i class="mdi mdi-download" /> {{ t.download }}
          </button>
        </div>
        <button
          type="button"
          class="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
          :aria-label="t.closePhoto"
          @click="modelOpen = null"
        >
          <i class="mdi mdi-close" />
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="openSample"
        class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
        role="dialog"
        aria-modal="true"
        :dir="fa ? 'rtl' : 'ltr'"
        @click="sampleOpen = null"
      >
        <img :src="openSample.image" :alt="openSample.caption" class="max-h-[85%] max-w-full rounded-2xl object-contain" @click.stop />
        <p v-if="openSample.caption" class="max-w-xl text-center text-sm text-white">{{ openSample.caption }}</p>
        <button
          type="button"
          class="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
          :aria-label="t.closePhoto"
          @click.stop="sampleOpen = null"
        >
          <i class="mdi mdi-close" />
        </button>
        <template v-if="samples.length > 1">
          <button
            type="button"
            class="absolute start-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            :aria-label="t.prevPhoto"
            @click.stop="stepSample(-1)"
          >
            <i class="mdi" :class="fa ? 'mdi-chevron-right' : 'mdi-chevron-left'" />
          </button>
          <button
            type="button"
            class="absolute end-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            :aria-label="t.nextPhoto"
            @click.stop="stepSample(1)"
          >
            <i class="mdi" :class="fa ? 'mdi-chevron-left' : 'mdi-chevron-right'" />
          </button>
        </template>
      </div>
    </Teleport>
  </section>
</template>
