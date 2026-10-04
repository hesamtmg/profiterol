import type { FieldDef } from '@profiterol/blocks';

export interface PublicCollection {
  key: string;
  name: string;
  slug: string;
  href: string;
  fields: FieldDef[];
  alternates: { locale: string; slug: string }[];
}

export interface ItemCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  tags: string[];
  publishedAt: string | null;
  href: string;
}

/** What the API attaches to a collection-list block, and what `/public/:locale/items` returns. */
export interface CollectionListData {
  collection: PublicCollection | null;
  items: ItemCard[];
  tags: string[];
}

export interface PublicItem {
  collection: PublicCollection;
  item: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    tags: string[];
    data: Record<string, unknown>;
    cover: string;
    seoDescription: string;
    publishedAt: string | null;
    updatedAt: string;
  };
  alternates: { locale: string; path: string }[];
  related: ItemCard[];
}

/** Admin shapes. */
export interface AdminCollection {
  id: string;
  key: string;
  name: Record<string, string>;
  slugs: Record<string, string>;
  fields: FieldDef[];
  itemCount?: number;
  createdAt: string;
}

export interface AdminItemTranslation {
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string[];
  data: Record<string, unknown>;
  seoDescription: string;
}

export interface AdminItem {
  id: string;
  status: 'draft' | 'published';
  cover: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: AdminItemTranslation[];
}

/** The site's collections for admin pickers, loaded once per session. */
export function useAdminCollections() {
  const list = useState<AdminCollection[] | null>('admin-collections', () => null);
  const api = useApi();
  async function load(force = false) {
    if (!list.value || force) list.value = await api<AdminCollection[]>('/admin/collections');
    return list.value;
  }
  return { list, load };
}

/** Splits text into paragraphs at blank lines. */
export function paragraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
