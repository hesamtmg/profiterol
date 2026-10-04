import type { BlockNode } from '@profiterol/blocks';

export interface AdminTranslation {
  id?: string;
  locale: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  blocks: BlockNode[];
  publishedBlocks?: BlockNode[] | null;
}

export interface AdminPage {
  id: string;
  name: string;
  isHome: boolean;
  status: 'draft' | 'published';
  publishedAt: string | null;
  updatedAt: string;
  translations: AdminTranslation[];
}

export interface MediaItem {
  id: string;
  url: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
}
