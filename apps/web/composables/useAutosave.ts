import type { Ref } from 'vue';

interface AutosaveOptions {
  /** A string that changes whenever there is something new to save. */
  snapshot: () => string;
  dirty: Ref<boolean>;
  /** True while a save is already running. */
  busy: Ref<boolean>;
  /** Saves and reports success. */
  save: () => Promise<boolean>;
  /** Extra condition, e.g. only autosave drafts. */
  allowed?: Ref<boolean>;
  delayMs?: number;
}

/**
 * Saves a few seconds after the last change. The on/off choice is remembered in this browser.
 * A save that fails (for example a duplicate address) is not retried until something changes again.
 */
export function useAutosave(opts: AutosaveOptions) {
  const enabled = ref(true);
  const lastSavedAt = ref<Date | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failed = '';

  try {
    enabled.value = localStorage.getItem('pt_autosave') !== 'off';
  } catch {
    // Storage can be unavailable (private mode); keep the default.
  }
  watch(enabled, (on) => {
    try {
      localStorage.setItem('pt_autosave', on ? 'on' : 'off');
    } catch {
      // ignore
    }
  });

  async function run() {
    if (!opts.dirty.value) return;
    if (opts.busy.value) {
      timer = setTimeout(run, 500);
      return;
    }
    const snap = opts.snapshot();
    if (await opts.save()) lastSavedAt.value = new Date();
    else failed = snap;
  }

  watch(
    () => [opts.snapshot(), enabled.value, opts.allowed?.value ?? true] as const,
    ([snap, on, allowed]) => {
      clearTimeout(timer);
      if (!on || !allowed || !opts.dirty.value || snap === failed) return;
      timer = setTimeout(run, opts.delayMs ?? 2500);
    },
  );

  onBeforeUnmount(() => clearTimeout(timer));
  return { enabled, lastSavedAt };
}
