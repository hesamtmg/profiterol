/**
 * `v-reveal` fades an element up (or in from the left or right) the first time it scrolls into
 * view, like the minicms sections. `v-reveal="{ from: 'left', delay: 200 }"`. Elements already on screen when the
 * page loads are left alone, so nothing flickers, and visitors who turn off motion see no animation.
 */
type Reveal = { from?: 'up' | 'left' | 'right'; delay?: number } | undefined;

export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null;

  function getObserver() {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('reveal-in');
          observer!.unobserve(el);
          // Afterwards, hand the element back its own transitions (e.g. hover effects), without the delay.
          setTimeout(() => {
            el.classList.remove('reveal', 'reveal-up', 'reveal-left', 'reveal-right', 'reveal-in');
            el.style.transitionDelay = '';
          }, 850 + (parseFloat(el.style.transitionDelay) || 0));
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' },
    );
    return observer;
  }

  nuxtApp.vueApp.directive<HTMLElement, Reveal>('reveal', {
    getSSRProps: () => ({}),
    mounted(el, { value }) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal', `reveal-${value?.from ?? 'up'}`);
      if (value?.delay) el.style.transitionDelay = `${value.delay}ms`;
      getObserver().observe(el);
    },
    unmounted(el) {
      observer?.unobserve(el);
    },
  });
});
