/** `$fetch` pointed at the API: directly to the container on the server, through nginx in the browser. */
export function useApi() {
  const config = useRuntimeConfig();
  const token = useCookie<string | null>('pt_token', { sameSite: 'lax' });

  return <T>(path: string, opts: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, {
      ...opts,
      baseURL: import.meta.server ? config.apiInternal : config.public.apiBase,
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
