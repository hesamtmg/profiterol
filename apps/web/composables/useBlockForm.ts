/** A field of a form block, as set in the editor. */
export interface FormField {
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  options: string;
  placeholder: string;
}

/** Splits a choice field's options; Persian commas work too. */
export function formChoices(options: string) {
  return (options ?? '')
    .split(/[,،]/)
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Sending logic shared by the form blocks. Messages go to the admin inbox (and optionally by email);
 * the API checks every answer against the published form.
 */
export function useBlockForm(
  props: { p: { fields: FormField[]; successMessage: string }; locale: string; data?: { pageId: string; blockId: string } },
) {
  const editing = Boolean(useBlockEditing());
  const api = useApi();
  const values = ref<string[]>([]);
  /** Honeypot: hidden from people; bots that fill it in are ignored. */
  const website = ref('');
  const startedAt = ref(0);
  const sending = ref(false);
  const sent = ref('');
  const errors = ref<string[]>([]);

  watch(
    () => props.p.fields?.length ?? 0,
    (n) => (values.value = Array.from({ length: n }, (_, i) => values.value[i] ?? '')),
    { immediate: true },
  );

  onMounted(() => (startedAt.value = Date.now()));

  async function submit() {
    if (!props.data || editing) return;
    sending.value = true;
    errors.value = [];
    try {
      const res = await api<{ ok: boolean; message?: string }>(`/public/forms/${props.data.pageId}/${props.data.blockId}`, {
        method: 'POST',
        body: { locale: props.locale, values: values.value, website: website.value, startedAt: startedAt.value },
      });
      sent.value = res.message || props.p.successMessage;
    } catch (err) {
      const data = (err as { data?: { message?: string; errors?: string[] } }).data;
      const fallback = props.locale === 'fa' ? 'ارسال نشد. دوباره تلاش کنید.' : 'The message could not be sent. Please try again.';
      errors.value = data?.errors?.length ? data.errors : [data?.message ?? fallback];
    } finally {
      sending.value = false;
    }
  }

  return { editing, values, website, sending, sent, errors, submit };
}
