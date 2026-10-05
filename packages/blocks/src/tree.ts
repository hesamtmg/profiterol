import type { BlockNode } from './types.js';

/** Every block of a page, nested ones included (parents before their children). */
export function allBlocks(blocks: BlockNode[]): BlockNode[] {
  const out: BlockNode[] = [];
  for (const b of blocks) {
    out.push(b);
    for (const column of b.children ?? []) out.push(...allBlocks(column));
  }
  return out;
}

/** Where a block sits: the list holding it, its position there, and the layout block around it (if nested). */
export interface BlockPlace {
  block: BlockNode;
  list: BlockNode[];
  index: number;
  parent: BlockNode | null;
}

export function findBlock(blocks: BlockNode[], id: string, parent: BlockNode | null = null): BlockPlace | null {
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.id === id) return { block, list: blocks, index, parent };
    for (const column of block.children ?? []) {
      const found = findBlock(column, id, block);
      if (found) return found;
    }
  }
  return null;
}

/** A copy of a block tree with every block given a new id. */
export function cloneBlock(block: BlockNode, newId: () => string): BlockNode {
  const { data: _data, ...rest } = block;
  const copy: BlockNode = { ...JSON.parse(JSON.stringify(rest)), id: newId() };
  if (block.children) copy.children = block.children.map((column) => column.map((b) => cloneBlock(b, newId)));
  return copy;
}

/** Applies `fn` to every block, nested ones included, building a new tree. */
export function mapBlockTree(blocks: BlockNode[], fn: (block: BlockNode) => BlockNode): BlockNode[] {
  return blocks.map((b) => {
    const mapped = fn(b);
    return b.children ? { ...mapped, children: b.children.map((column) => mapBlockTree(column, fn)) } : mapped;
  });
}

/**
 * Sets a layout block's number of columns. Blocks from removed columns move into the last one kept, so nothing
 * is lost when going from 3 columns to 2.
 */
export function resizeColumns(block: BlockNode, slots: number): BlockNode[][] {
  const columns = (block.children ?? []).map((c) => [...c]);
  while (columns.length < slots) columns.push([]);
  if (columns.length > slots) {
    const extra = columns.splice(slots).flat();
    columns[slots - 1].push(...extra);
  }
  return columns;
}
