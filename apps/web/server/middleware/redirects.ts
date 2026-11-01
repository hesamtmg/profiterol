/** Old addresses outside the language prefixes (e.g. minicms's /page/about-us) go where Admin → Redirects says. */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return;
  const path = event.path.split('?')[0];
  if (!outsidePages(path)) return;
  const prefix = sitePrefix(event);
  const found = await findRedirect(requestHost(event), path, prefix);
  // A preview's own addresses are under its path.
  const to = found && prefix && found.to.startsWith('/') && !found.to.startsWith('//') ? prefix + found.to : found?.to;
  if (found && to) return sendRedirect(event, headerSafe(to), found.status);
});
