export type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'image'
  | 'color'
  | 'select'
  | 'number'
  | 'boolean'
  | 'list';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Choices for `select` fields. */
  options?: FieldOption[];
  /** Item shape for `list` fields. */
  fields?: FieldDef[];
  /** Which item field to show as the item title in the editor (for `list` fields). */
  itemLabel?: string;
  /** Upper bound for `list` length. */
  max?: number;
  help?: string;
}

export type BlockCategory = 'hero' | 'content' | 'cards' | 'media' | 'contact';

export interface BlockDef {
  type: string;
  label: string;
  /** Material Design Icons name, e.g. `mdi-view-grid`. */
  icon: string;
  category: BlockCategory;
  description: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
}

/** A block instance as stored in a page translation. */
export interface BlockNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface ValidationError {
  path: string;
  message: string;
}
