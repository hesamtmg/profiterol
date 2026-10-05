import { isTopLevelOnly, type BlockNode } from '@profiterol/blocks';
import type { InjectionKey, Ref } from 'vue';

/** What the page editor shares with the block frames on its canvas (top-level and inside columns). */
export interface EditorContext {
  selectedId: Ref<string | null>;
  dropTarget: Ref<string | null>;
  dropKind: Ref<'image' | 'video'>;
  locale: Ref<string>;
  /** The column the next block from the library goes into, set by a column's "Add a block" button. */
  insertTarget: Ref<{ parentId: string; column: number } | null>;
  select(id: string, scroll?: boolean): void;
  move(id: string, delta: number): void;
  duplicate(id: string): void;
  remove(id: string): void;
  inlineEdit(block: BlockNode, path: string, value: string): void;
  hiddenOnDevice(block: BlockNode): boolean;
  imageLabel(block: BlockNode): string;
  onBlockDragOver(block: BlockNode, e: DragEvent): void;
  onBlockDrop(block: BlockNode, e: DragEvent): void;
  /** Opens the library to add a block after this one. */
  addAfter(id: string): void;
  /** Opens the library to add a block into a column. */
  addInto(parent: BlockNode, column: number): void;
  /** Replaces the blocks of a column (after a drag inside, into or out of it). */
  setColumn(parent: BlockNode, column: number, blocks: BlockNode[]): void;
  /** Selected block after a drag from the library or another column lands here. */
  onAdded(list: BlockNode[], index: number): void;
}

export const editorKey: InjectionKey<EditorContext> = Symbol('page-editor');

export function useEditorContext(): EditorContext {
  const ctx = inject(editorKey);
  if (!ctx) throw new Error('useEditorContext() must be used inside the page editor');
  return ctx;
}

/** Sortable's `put` check for columns: full-screen and layout blocks stay on the page itself. */
export function canDropIntoColumn(_to: unknown, _from: unknown, dragged: HTMLElement): boolean {
  const type = dragged.dataset.type;
  return !!type && !isTopLevelOnly(type);
}
