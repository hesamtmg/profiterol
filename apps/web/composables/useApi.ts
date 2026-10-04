/** The admin login token. Marked Secure when the site is served over HTTPS. */
export function useTokenCookie() {
  const secure = import.meta.client ? location.protocol === 'https:' : useRequestURL({ xForwardedProto: true }).protocol === 'https:';
  return useCookie<string | null>('pt_token', { sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 7 });
}

/** `$fetch` pointed at the API: directly to the container on the server, through nginx in the browser. */
export function useApi() {
  const config = useRuntimeConfig();
  const token = useTokenCookie();

  return <T>(path: string, opts: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, {
      ...opts,
      baseURL: import.meta.server ? config.apiInternal : config.public.apiBase,
      // Fail fast while the API restarts (e.g. during an update) so visitors get the "back in a moment" page.
      timeout: import.meta.server ? 8000 : 20000,
      headers: {
        ...(opts.headers as Record<string, string> | undefined),
        ...(token.value ? { authorization: `Bearer ${token.value}` } : {}),
      },
    });
}

/** Pulls a readable message out of an API error. */
export function apiErrorMessage(err: unknown): string {
  const data = (err as { data?: { message?: string | string[]; errors?: { path: string; message: string }[] } })?.data;
  if (data?.errors?.length) return data.errors.map((e) => `${e.path} ${e.message}`).join('\n');
  if (Array.isArray(data?.message)) return data.message.join('\n');
  return data?.message ?? (err as Error)?.message ?? 'Something went wrong';
}
