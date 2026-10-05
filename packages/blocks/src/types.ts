export type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'image'
  /** An uploaded MP4/WebM file (same rules as a link). */
  | 'video'
  | 'color'
  | 'select'
  | 'number'
  | 'boolean'
  | 'list'
  /** Picks one of the site's collections (stored as its key). */
  | 'collection'
  /** Formatted text (HTML). The API cleans it on save, keeping only safe tags. */
  | 'richtext';

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
  /** Visitor-facing label per locale (collection fields), e.g. `{ fa: 'کارفرما' }`. Falls back to `label`. */
  labels?: Record<string, string>;
  /** The editor shows fields of a group together under a heading (e.g. the shared "style" fields). */
  group?: 'style' | 'advanced';
}

export type BlockCategory = 'layout' | 'hero' | 'content' | 'cards' | 'media' | 'contact' | 'classic' | 'animated';

export interface BlockDef {
  type: string;
  label: string;
  /** Material Design Icons name, e.g. `mdi-view-grid`. */
  icon: string;
  category: BlockCategory;
  description: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  /** Layout blocks hold other blocks: the number of places (columns) for given props. */
  slots?: (props: Record<string, unknown>) => number;
  /** Full-screen blocks that cannot be put inside a layout block. */
  topLevelOnly?: boolean;
}

/** A block instance as stored in a page translation. */
export interface BlockNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  /** Layout blocks only: the blocks in each column (one list per slot). */
  children?: BlockNode[][];
  /** Added by the API when it serves a page, e.g. a collection list's items. Never stored. */
  data?: unknown;
}

export interface ValidationError {
  path: string;
  message: string;
}
