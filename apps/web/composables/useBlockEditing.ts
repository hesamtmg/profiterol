import type { Component, InjectionKey } from 'vue';

/** Provided by a block in the editor canvas so its text can be edited in place. */
export interface BlockEditContext {
  /** Sets the prop at `path` (e.g. `title` or `items.2.text`) on the block being edited. */
  update(path: string, value: string): void;
}

export const blockEditKey: InjectionKey<BlockEditContext> = Symbol('block-edit');

/**
 * In the editor, layout blocks render each column with this component (a sortable list of editable blocks)
 * instead of plain blocks. Props: `parent` (the layout block) and `column` (its index).
 */
export const columnEditorKey: InjectionKey<Component> = Symbol('column-editor');

/** The edit context when rendered inside the editor canvas, otherwise null (public site). */
export function useBlockEditing(): BlockEditContext | null {
  return inject(blockEditKey, null);
}

/** Sets a value at a dotted path such as `cards.1.title`, creating nothing that is not already there. */
export function setAtPath(target: Record<string, unknown>, path: string, value: unknown): boolean {
  const keys = path.split('.');
  let node: unknown = target;
  for (const key of keys.slice(0, -1)) {
    if (node === null || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[key];
  }
  if (node === null || typeof node !== 'object') return false;
  (node as Record<string, unknown>)[keys[keys.length - 1]] = value;
  return true;
}
