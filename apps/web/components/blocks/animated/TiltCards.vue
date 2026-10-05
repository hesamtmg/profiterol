<script setup lang="ts">
/** Cards that tilt toward the mouse in 3D, with a shine following it. Touch screens and reduced motion get flat cards. */
import EditableText from '../../site/EditableText.vue';

interface Item {
  image: string;
  icon: string;
  title: string;
  text: string;
  link: string;
}

defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const MAX = 12; // degrees

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || reduced.value) return;
  const card = e.currentTarget as HTMLElement;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  card.style.transition = 'transform 0.08s linear';
  card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * MAX * 2}deg) rotateY(${(x - 0.5) * MAX * 2}deg) scale(1.03)`;
  card.style.setProperty('--gx', `${x * 100}%`);
  card.style.setProperty('--gy', `${y * 100}%`);
  card.style.setProperty('--glare', '1');
}

function onLeave(e: PointerEvent) {
  const card = e.currentTarget as HTMLElement;
  card.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1)';
  card.style.transform = '';
  card.style.setProperty('--glare', '0');
}
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-12 text-center text-3xl font-black @3xl:text-5xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <div class="grid gap-6 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <component
          :is="item.link && !editing ? 'a' : 'article'"
          v-for="(item, i) in p.items"
          :key="i"
          :href="item.link && !editing ? resolveHref(item.link, locale) : undefined"
          class="relative block overflow-hidden rounded-[2rem] bg-dark p-8 text-white shadow-xl [transform-style:preserve-3d] @3xl:p-10"
          @pointermove="onMove"
          @pointerleave="onLeave"
        >
          <!-- Shine -->
          <div
            class="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style="
              opacity: var(--glare, 0);
              background: radial-gradient(400px circle at var(--gx, 50%) var(--gy, 50%), rgb(255 255 255 / 0.22), transparent 55%);
            "
            aria-hidden="true"
          />
          <!-- Colored edge glow -->
          <div
            class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary opacity-40 blur-3xl"
            aria-hidden="true"
          />
          <div class="relative [transform:translateZ(50px)]">
            <img v-if="item.image" :src="item.image" alt="" class="mb-8 h-16 w-16 rounded-2xl object-cover" loading="lazy" />
            <span
              v-else
              class="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl text-primary ring-1 ring-white/15"
            >
              <i class="mdi" :class="/^mdi-[a-z0-9-]+$/.test(item.icon) ? item.icon : 'mdi-star-four-points-outline'" />
            </span>
            <h3 class="text-2xl font-bold"><EditableText :value="item.title" :path="`items.${i}.title`" /></h3>
            <p v-if="item.text || editing" class="mt-3 font-light leading-relaxed opacity-75">
              <EditableText :value="item.text" :path="`items.${i}.text`" multiline />
            </p>
            <span v-if="item.link" class="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <i class="mdi mdi-arrow-right rtl:rotate-180" />
            </span>
          </div>
        </component>
      </div>
    </div>
  </section>
</template>
