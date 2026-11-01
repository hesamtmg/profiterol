/**
 * On a preview site (/preview/<name>, see server/middleware/00.site-prefix.ts), a root-relative link that does not
 * carry the preview's path would leave it for the main site: links typed into rich text, or old ones in content.
 * They are corrected as they are clicked, before anything else (page transitions, the router) reads them.
 */
export default defineNuxtPlugin(() => {
  const base = useRuntimeConfig().public.sitePrefix;
  if (!base) return;
  const fix = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    const href = a?.getAttribute('href');
    if (!a || !href) return;
    const fixed = withSiteBase(href);
    if (fixed !== href) a.setAttribute('href', fixed);
  };
  // Capture phase, so it runs first; auxclick covers middle-click "open in a new tab".
  document.addEventListener('click', fix, true);
  document.addEventListener('auxclick', fix, true);
});
