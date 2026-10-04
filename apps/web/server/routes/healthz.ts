/** Liveness check for Docker: the Nuxt server is up and answering. */
export default defineEventHandler((event) => {
  setHeader(event, 'cache-control', 'no-store');
  return 'ok';
});
