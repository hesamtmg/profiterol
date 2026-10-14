import { styleFields } from './layout.js';
import { createListItem } from './registry.js';
import type { BlockDef, FieldDef, FieldType, ValidationError } from './types.js';
import { validateFields } from './validate.js';

/** Custom block types always start with this, so they can never clash with a built-in block. */
export const CUSTOM_BLOCK_PREFIX = 'ai-';

/**
 * Field types a custom block may use. Collections need data the API attaches per block type, and formatted text
 * needs v-html, which custom blocks may not use.
 */
export const customFieldTypes: FieldType[] = ['text', 'textarea', 'url', 'image', 'video', 'color', 'select', 'number', 'boolean', 'list'];

const MAX_FIELDS = 30;
const MAX_OPTIONS = 30;
const MAX_LIST = 50;
const KEY = /^[a-z][A-Za-z0-9]{0,39}$/;
const ICON = /^mdi-[a-z0-9-]{1,60}$/;

/** Field keys every block already has (style, animation, anchor, "Show on"): a custom block cannot reuse them. */
export const reservedFieldKeys = (): string[] => [...styleFields.map((f) => f.key), 'animation', 'anchor', 'showOn'];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanField(input: unknown, path: string, nested: boolean, reserved: string[], errors: ValidationError[]): FieldDef | null {
  if (!isPlainObject(input)) {
    errors.push({ path, message: 'must be an object' });
    return null;
  }
  const key = String(input.key ?? '');
  const type = input.type as FieldType;
  if (!KEY.test(key)) errors.push({ path: `${path}.key`, message: 'must be camelCase letters and digits, e.g. "buttonLabel"' });
  else if (reserved.includes(key)) errors.push({ path: `${path}.key`, message: `"${key}" is a shared field every block already has` });
  if (!customFieldTypes.includes(type)) {
    errors.push({ path: `${path}.type`, message: `must be one of ${customFieldTypes.join(', ')}` });
    return null;
  }
  const field: FieldDef = { key, label: text(input.label, 80) || key, type };
  const help = text(input.help, 200);
  if (help) field.help = help;

  if (type === 'select') {
    const options = Array.isArray(input.options) ? input.options : [];
    field.options = options
      .filter(isPlainObject)
      .slice(0, MAX_OPTIONS)
      .map((o) => ({ value: text(o.value, 60), label: text(o.label, 80) || text(o.value, 60) }));
    if (!field.options.length) errors.push({ path: `${path}.options`, message: 'a select needs at least one option' });
  }
  if (type === 'list') {
    if (nested) {
      errors.push({ path: `${path}.type`, message: 'a list cannot hold another list' });
      return null;
    }
    const sub = Array.isArray(input.fields) ? input.fields : [];
    if (!sub.length) errors.push({ path: `${path}.fields`, message: 'a list needs the fields of one item' });
    field.fields = cleanFields(sub, `${path}.fields`, true, [], errors);
    const max = Number(input.max);
    field.max = Number.isInteger(max) && max > 0 ? Math.min(max, MAX_LIST) : MAX_LIST;
    const itemLabel = String(input.itemLabel ?? '');
    if (field.fields.some((f) => f.key === itemLabel)) field.itemLabel = itemLabel;
  }
  return field;
}

function cleanFields(input: unknown[], path: string, nested: boolean, reserved: string[], errors: ValidationError[]): FieldDef[] {
  if (input.length > MAX_FIELDS) errors.push({ path, message: `can have at most ${MAX_FIELDS} fields` });
  const out: FieldDef[] = [];
  input.slice(0, MAX_FIELDS).forEach((f, i) => {
    const field = cleanField(f, `${path}[${i}]`, nested, reserved, errors);
    if (!field) return;
    if (out.some((o) => o.key === field.key)) errors.push({ path: `${path}[${i}].key`, message: 'is used twice' });
    else out.push(field);
  });
  return out;
}

/** An empty value for a field, used when a default is missing. */
function emptyValue(field: FieldDef): unknown {
  return createListItem({ key: 'x', label: '', type: 'list', fields: [field] })[field.key];
}

/**
 * Checks and tidies a block definition written by the AI (or edited by hand): known field types, unique camelCase
 * keys, a default for every field that passes the same checks as a saved page. The type and category are set by
 * the caller. Returns the cleaned definition, without the shared fields (see withCommonFields).
 */
export function validateBlockDef(input: unknown, type: string): { def: BlockDef; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const raw = isPlainObject(input) ? input : {};
  if (!isPlainObject(input)) errors.push({ path: 'def', message: 'must be an object' });
  if (!type.startsWith(CUSTOM_BLOCK_PREFIX)) errors.push({ path: 'def.type', message: `must start with "${CUSTOM_BLOCK_PREFIX}"` });

  const fields = cleanFields(Array.isArray(raw.fields) ? raw.fields : [], 'def.fields', false, reservedFieldKeys(), errors);
  const given = isPlainObject(raw.defaults) ? raw.defaults : {};
  const defaults: Record<string, unknown> = {};
  for (const f of fields) defaults[f.key] = f.key in given ? given[f.key] : emptyValue(f);
  errors.push(...validateFields(fields, defaults, 'def.defaults'));

  const icon = text(raw.icon, 64);
  const def: BlockDef = {
    type,
    label: text(raw.label, 60) || 'Custom block',
    icon: ICON.test(icon) ? icon : 'mdi-creation',
    category: 'custom',
    description: text(raw.description, 200),
    fields,
    defaults,
  };
  return { def, errors };
}
