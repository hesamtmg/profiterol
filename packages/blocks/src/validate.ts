import { getBlock } from './registry.js';
import type { BlockNode, FieldDef, ValidationError } from './types.js';

const MAX_BLOCKS = 200;
const MAX_STRING = 20000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Allows relative paths, anchors, http(s), mailto and tel; rejects `javascript:` and friends. */
export function isSafeUrl(value: string): boolean {
  const v = value.trim();
  if (v === '' || v.startsWith('/') || v.startsWith('#')) return true;
  return /^(https?:|mailto:|tel:)/i.test(v);
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
      if ((field.type === 'url' || field.type === 'image') && !isSafeUrl(value)) {
        errors.push({ path, message: 'must be a relative path or an http(s), mailto or tel link' });
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

/** Validates a page's block list against the registry. Missing props fall back to defaults when rendered. */
export function validateBlocks(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(input)) return [{ path: 'blocks', message: 'must be a list' }];
  if (input.length > MAX_BLOCKS) errors.push({ path: 'blocks', message: `can have at most ${MAX_BLOCKS} blocks` });

  const ids = new Set<string>();
  input.forEach((node, i) => {
    const path = `blocks[${i}]`;
    if (!isPlainObject(node)) {
      errors.push({ path, message: 'must be an object' });
      return;
    }
    const { id, type, props } = node as Partial<BlockNode>;
    if (typeof id !== 'string' || id === '') errors.push({ path: `${path}.id`, message: 'is required' });
    else if (ids.has(id)) errors.push({ path: `${path}.id`, message: 'is duplicated' });
    else ids.add(id);

    const def = typeof type === 'string' ? getBlock(type) : undefined;
    if (!def) {
      errors.push({ path: `${path}.type`, message: `unknown block type "${String(type)}"` });
      return;
    }
    checkProps(def.fields, props, `${path}.props`, errors);
  });
  return errors;
}

/** Returns props merged over the block's defaults, so renderers never see missing fields. */
export function withDefaults(node: BlockNode): Record<string, unknown> {
  const def = getBlock(node.type);
  return { ...(def?.defaults ?? {}), ...(node.props ?? {}) };
}
