/**
 * `v-animate="'zoom'"`: the entrance animation chosen for a block in the editor (Wix's "Animation" panel).
 * The hidden starting state is rendered on the server, so nothing flashes before it plays; the animation runs
 * when the block scrolls into view. Changing the choice in the editor replays it at once.
 * Visitors who turn off motion, and browsers without JavaScript (see app.vue), see the block straight away.
 */
const NAMES = ['fade', 'rise', 'slide-start', 'slide-end', 'zoom', 'flip', 'blur', 'reveal'];
const valid = (v: unknown): v is string => typeof v === 'string' && NAMES.includes(v);
const classesOf = (name: string) => ['anim', `anim-${name}`];
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null;

  function finish(el: HTMLElement) {
    // Once played, drop the classes so no transform is left behind (it would break fixed/sticky children).
    timers.set(
      el,
      setTimeout(() => el.classList.remove(...[...el.classList].filter((c) => c === 'anim' || c.startsWith('anim-'))), 1300),
    );
  }

  function getObserver() {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer!.unobserve(el);
          el.classList.add('anim-in');
          finish(el);
        }
      },
      { threshold: 0.12 },
    );
    return observer;
  }

  function start(el: HTMLElement, name: unknown) {
    clearTimeout(timers.get(el));
    observer?.unobserve(el);
    el.classList.remove(...[...el.classList].filter((c) => c === 'anim' || c.startsWith('anim-')));
    if (!valid(name) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add(...classesOf(name));
    void el.offsetWidth; // restart from the hidden state
    getObserver().observe(el);
  }

  nuxtApp.vueApp.directive<HTMLElement, unknown>('animate', {
    getSSRProps: ({ value }) => (valid(value) ? { class: classesOf(value).join(' ') } : {}),
    mounted: (el, { value }) => start(el, value),
    updated(el, { value, oldValue }) {
      if (value !== oldValue) start(el, value);
    },
    unmounted(el) {
      clearTimeout(timers.get(el));
      observer?.unobserve(el);
    },
  });
});
