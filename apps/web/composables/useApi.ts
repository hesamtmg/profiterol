/**
 * The admin's session lives in an httpOnly cookie that scripts cannot read. Changes must echo the readable
 * `pt_csrf` cookie in a header, which proves the request comes from this site (see apps/api/src/auth/session.ts).
 */
function csrfToken(): string {
  if (!import.meta.client) return '';
  return decodeURIComponent(document.cookie.match(/(?:^|; )pt_csrf=([^;]*)/)?.[1] ?? '');
}

/** `$fetch` pointed at the API: directly to the container on the server, through nginx in the browser. */
export function useApi() {
  const config = useRuntimeConfig();

  return <T>(path: string, opts: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, {
      ...opts,
      baseURL: import.meta.server ? config.apiInternal : config.public.apiBase,
      // Fail fast while the API restarts (e.g. during an update) so visitors get the "back in a moment" page.
      timeout: import.meta.server ? 8000 : 20000,
      headers: {
        ...(opts.headers as Record<string, string> | undefined),
        ...(csrfToken() ? { 'x-csrf-token': csrfToken() } : {}),
      },
    });
}

/** Pulls a readable message out of an API error, in the admin's language when the message is known. */
export function apiErrorMessage(err: unknown): string {
  const data = (err as { data?: { message?: string | string[]; errors?: { path: string; message: string }[] } })?.data;
  if (data?.errors?.length) return data.errors.map((e) => `${e.path} ${e.message}`).join('\n');
  if (Array.isArray(data?.message)) return data.message.map((m) => translate(m)).join('\n');
  return translate(data?.message ?? (err as Error)?.message ?? 'Something went wrong');
}
