import type { FieldDef, FieldType, ValidationError } from './types.js';

/** Field types an editor can add to a collection. `list` is only offered as an image gallery. */
export const collectionFieldTypes: FieldType[] = ['text', 'textarea', 'url', 'image', 'video', 'number', 'boolean', 'color', 'list'];

/** Every item already has these, so custom fields cannot reuse the names. */
export const reservedItemKeys = ['title', 'slug', 'excerpt', 'body', 'tags', 'cover', 'seoDescription'];

/** The sub-fields of a gallery: a list of images with captions. */
export const galleryItemFields: FieldDef[] = [
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'caption', label: 'Caption', type: 'text' },
];

const KEY = /^[a-z][a-zA-Z0-9]{0,39}$/;

/** Checks a collection's custom field definitions before they are saved. */
export function validateFieldDefs(input: unknown): ValidationError[] {
  if (!Array.isArray(input)) return [{ path: 'fields', message: 'must be a list' }];
  const errors: ValidationError[] = [];
  if (input.length > 30) errors.push({ path: 'fields', message: 'can have at most 30 fields' });
  const keys = new Set<string>();

  input.forEach((f, i) => {
    const path = `fields[${i}]`;
    const def = f as Partial<FieldDef>;
    if (typeof def !== 'object' || def === null) {
      errors.push({ path, message: 'must be an object' });
      return;
    }
    if (typeof def.key !== 'string' || !KEY.test(def.key)) {
      errors.push({ path: `${path}.key`, message: 'must start with a lowercase letter and use only letters and digits' });
    } else if (reservedItemKeys.includes(def.key)) {
      errors.push({ path: `${path}.key`, message: `"${def.key}" is a built-in field` });
    } else if (keys.has(def.key)) {
      errors.push({ path: `${path}.key`, message: 'is used twice' });
    } else keys.add(def.key);

    if (typeof def.label !== 'string' || !def.label.trim() || def.label.length > 60) {
      errors.push({ path: `${path}.label`, message: 'is required (up to 60 characters)' });
    }
    if (!collectionFieldTypes.includes(def.type as FieldType)) {
      errors.push({ path: `${path}.type`, message: 'is not a supported field type' });
    }
    if (def.type === 'list' && JSON.stringify(def.fields) !== JSON.stringify(galleryItemFields)) {
      errors.push({ path: `${path}.fields`, message: 'lists must be image galleries' });
    }
  });
  return errors;
}

/** Normalizes a field definition from the editor into the stored shape. */
export function cleanFieldDef(def: FieldDef): FieldDef {
  const clean: FieldDef = { key: def.key, label: def.label.trim(), type: def.type };
  if (def.labels && typeof def.labels === 'object') {
    clean.labels = Object.fromEntries(
      Object.entries(def.labels)
        .filter(([k, v]) => /^[a-z]{2}$/.test(k) && typeof v === 'string' && v.trim())
        .map(([k, v]) => [k, v.trim().slice(0, 60)]),
    );
  }
  if (def.type === 'list') {
    clean.fields = galleryItemFields;
    clean.itemLabel = 'caption';
  }
  return clean;
}
