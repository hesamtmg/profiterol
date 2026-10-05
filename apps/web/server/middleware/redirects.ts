/** Old addresses outside the language prefixes (e.g. minicms's /page/about-us) go where Admin → Redirects says. */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return;
  const path = event.path.split('?')[0];
  if (!outsidePages(path)) return;
  const found = await findRedirect(path);
  if (found) return sendRedirect(event, headerSafe(found.to), found.status);
});
