import { getBlock } from './registry.js';
import type { BlockDef, BlockNode, FieldDef, ValidationError } from './types.js';

const MAX_BLOCKS = 200;
const MAX_STRING = 20000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Allows relative links (`/page`, `#anchor`, `about-us`), http(s), mailto and tel; rejects `javascript:` and
 * any other scheme. Tabs, newlines and control characters are removed first, as browsers do, so a scheme
 * cannot be hidden inside them.
 */
export function isSafeUrl(value: string): boolean {
  // Browsers ignore control characters and spaces inside a scheme ("java\tscript:"), so they are removed first.
  // eslint-disable-next-line no-control-regex
  const v = value.replace(/[\u0000-\u0020\u007f]/g, '');
  const scheme = v.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return true;
  return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase());
}

/** A `quad` field's grid: `cols` × `rows` points, row by row from the top left, as fractions of the photo. */
export interface Mesh {
  cols: number;
  rows: number;
  points: [number, number][];
}

export const MESH_MIN = 2;
export const MESH_MAX = 6;

/** Reads a `quad` value ("CxR:x,y,…", or four clockwise corners) into its grid, or null when empty or malformed. */
export function parseMesh(value: string): Mesh | null {
  const head = value.match(/^\s*(\d)x(\d)\s*:/);
  const [cols, rows] = head ? [Number(head[1]), Number(head[2])] : [2, 2];
  if (cols < MESH_MIN || cols > MESH_MAX || rows < MESH_MIN || rows > MESH_MAX) return null;
  const n = value
    .slice(head ? head[0].length : 0)
    .split(',')
    .map((v) => (v.trim() === '' ? NaN : Number(v)));
  if (n.length !== cols * rows * 2 || n.some((v) => !Number.isFinite(v) || v < -0.5 || v > 1.5)) return null;
  const points = Array.from({ length: cols * rows }, (_, i) => [n[i * 2], n[i * 2 + 1]] as [number, number]);
  // The older form goes round the corners clockwise; the grid goes row by row.
  if (!head) [points[2], points[3]] = [points[3], points[2]];
  return { cols, rows, points };
}

/** Writes a grid back as a `quad` value. */
export function formatMesh({ cols, rows, points }: Mesh): string {
  return `${cols}x${rows}:${points
    .flat()
    .map((v) => +v.toFixed(4))
    .join(',')}`;
}

function checkValue(field: FieldDef, value: unknown, path: string, errors: ValidationError[]): void {
  switch (field.type) {
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push({ path, message: 'must be a number' });
      return;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push({ path, message: 'must be true or false' });
      return;
    case 'list': {
      if (!Array.isArray(value)) {
        errors.push({ path, message: 'must be a list' });
        return;
      }
      if (field.max !== undefined && value.length > field.max) {
        errors.push({ path, message: `can have at most ${field.max} items` });
      }
      value.forEach((item, i) => checkProps(field.fields ?? [], item, `${path}[${i}]`, errors));
      return;
    }
    default: {
      if (typeof value !== 'string') {
        errors.push({ path, message: 'must be text' });
        return;
      }
      if (value.length > MAX_STRING) errors.push({ path, message: 'is too long' });
      if ((field.type === 'url' || field.type === 'image' || field.type === 'video') && !isSafeUrl(value)) {
        errors.push({ path, message: 'must be a relative path or an http(s), mailto or tel link' });
      }
      if (field.type === 'quad' && value !== '' && !parseMesh(value)) {
        errors.push({ path, message: `must be a grid of points: "CxR:" (${MESH_MIN} to ${MESH_MAX} each), then x,y for each point` });
      }
      if (field.type === 'color' && value !== '' && !/^#[0-9a-f]{3,8}$/i.test(value)) {
        errors.push({ path, message: 'must be a hex color like #00a998' });
      }
      if (field.type === 'select' && !field.options?.some((o) => o.value === value)) {
        errors.push({ path, message: 'is not one of the allowed options' });
      }
    }
  }
}

function checkProps(fields: FieldDef[], props: unknown, path: string, errors: ValidationError[]): void {
  if (!isPlainObject(props)) {
    errors.push({ path, message: 'must be an object' });
    return;
  }
  for (const key of Object.keys(props)) {
    const field = fields.find((f) => f.key === key);
    if (!field) {
      errors.push({ path: `${path}.${key}`, message: 'is not a known field' });
      continue;
    }
    checkValue(field, props[key], `${path}.${key}`, errors);
  }
}

/**
 * Validates a page's block list against the registry. Layout blocks may hold one level of other blocks, one list
 * per column; full-screen and layout blocks cannot be nested. Missing props fall back to defaults when rendered.
 * `extra`: the site's own (custom) block types, besides the built-in ones.
 */
export function validateBlocks(input: unknown, extra?: BlockDef[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(input)) return [{ path: 'blocks', message: 'must be a list' }];
  const ids = new Set<string>();
  let count = 0;

  const checkList = (list: unknown[], base: string, nested: boolean) => {
    list.forEach((node, i) => {
      count++;
      const path = `${base}[${i}]`;
      if (!isPlainObject(node)) {
        errors.push({ path, message: 'must be an object' });
        return;
      }
      const { id, type, props, children } = node as Partial<BlockNode>;
      if (typeof id !== 'string' || id === '') errors.push({ path: `${path}.id`, message: 'is required' });
      else if (ids.has(id)) errors.push({ path: `${path}.id`, message: 'is duplicated' });
      else ids.add(id);

      const def = typeof type === 'string' ? getBlock(type, extra) : undefined;
      if (!def) {
        errors.push({ path: `${path}.type`, message: `unknown block type "${String(type)}"` });
        return;
      }
      if (nested && def.topLevelOnly) errors.push({ path: `${path}.type`, message: 'cannot be placed inside columns or a group' });
      checkProps(def.fields, props, `${path}.props`, errors);

      if (children === undefined) return;
      if (!def.slots) {
        errors.push({ path: `${path}.children`, message: 'only columns and groups can hold other blocks' });
        return;
      }
      const slots = def.slots(isPlainObject(props) ? { ...def.defaults, ...props } : def.defaults);
      if (!Array.isArray(children) || children.length !== slots || !children.every(Array.isArray)) {
        errors.push({ path: `${path}.children`, message: `must be ${slots} list(s) of blocks` });
        return;
      }
      children.forEach((column, c) => checkList(column, `${path}.children[${c}]`, true));
    });
  };

  checkList(input, 'blocks', false);
  if (count > MAX_BLOCKS) errors.push({ path: 'blocks', message: `can have at most ${MAX_BLOCKS} blocks` });
  return errors;
}

/** Returns props merged over the block's defaults, so renderers never see missing fields. */
export function withDefaults(node: BlockNode, extra?: BlockDef[]): Record<string, unknown> {
  const def = getBlock(node.type, extra);
  return { ...(def?.defaults ?? {}), ...(node.props ?? {}) };
}

/** Validates a record of values (e.g. a collection item's custom fields) against field definitions. */
export function validateFields(fields: FieldDef[], data: unknown, path = 'data'): ValidationError[] {
  const errors: ValidationError[] = [];
  checkProps(fields, data, path, errors);
  return errors;
}

function cleanRichText(fields: FieldDef[], props: Record<string, unknown>, clean: (html: string) => string): Record<string, unknown> {
  const out = { ...props };
  for (const f of fields) {
    const v = out[f.key];
    if (f.type === 'richtext' && typeof v === 'string') out[f.key] = clean(v);
    else if (f.type === 'list' && Array.isArray(v)) {
      out[f.key] = v.map((item) => (isPlainObject(item) ? cleanRichText(f.fields ?? [], item, clean) : item));
    }
  }
  return out;
}

/** Runs `clean` over every formatted-text value (nested blocks included), e.g. to strip unsafe HTML before saving. */
export function mapRichText(blocks: BlockNode[], clean: (html: string) => string, extra?: BlockDef[]): BlockNode[] {
  return blocks.map((b) => {
    const def = getBlock(b.type, extra);
    const out = def && isPlainObject(b.props) ? { ...b, props: cleanRichText(def.fields, b.props, clean) } : b;
    return Array.isArray(b.children) ? { ...out, children: b.children.map((column) => mapRichText(column, clean, extra)) } : out;
  });
}
