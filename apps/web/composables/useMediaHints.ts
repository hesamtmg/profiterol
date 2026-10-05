/** Per upload URL: a tiny blurred preview to show while the photo loads, and a description in the page's language. */
export type MediaHints = Record<string, { blur?: string; alt?: string }>;

/** Filled by the page from the API's `media` field; read by the `v-srcset` directive on every <img>. */
export const useMediaHints = () => useState<MediaHints>('media-hints', () => ({}));
