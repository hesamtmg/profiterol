<script setup lang="ts">
/** Plans side by side with prices and features. If any plan has a yearly price, a switch flips every price. */
import EditableText from '../site/EditableText.vue';

interface Plan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  description: string;
  features: string;
  buttonLabel: string;
  buttonLink: string;
  highlighted: boolean;
  badge: string;
}

const props = defineProps<{
  p: { title: string; subtitle: string; currency: string; monthlyLabel: string; yearlyLabel: string; plans: Plan[] };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const yearly = ref(false);
const fa = computed(() => props.locale === 'fa');
const hasYearly = computed(() => (props.p.plans ?? []).some((pl) => pl.yearlyPrice));

function features(text: string) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith('-') ? { text: l.slice(1).trim(), included: false } : { text: l, included: true }));
}

const priceOf = (pl: Plan) => (yearly.value && pl.yearlyPrice ? pl.yearlyPrice : pl.price);
const isNumber = (v: string) => /^[\d.,۰-۹٬]+$/.test(String(v ?? '').trim());
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div class="text-center">
        <h2 class="text-3xl font-black @3xl:text-5xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
        <p v-if="p.subtitle || editing" class="mt-3 font-light text-muted @3xl:text-lg">
          <EditableText :value="p.subtitle" path="subtitle" multiline />
        </p>
      </div>

      <!-- Monthly / yearly switch -->
      <div v-if="hasYearly" class="mt-10 flex justify-center">
        <div
          class="relative inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium"
          role="radiogroup"
          :aria-label="fa ? 'دوره‌ی پرداخت' : 'Billing period'"
        >
          <span
            class="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow transition-all duration-300 ease-out"
            :class="yearly ? 'start-1/2' : 'start-1'"
            aria-hidden="true"
          />
          <button
            type="button"
            role="radio"
            :aria-checked="!yearly"
            class="relative z-10 w-40 rounded-full px-4 py-2 @3xl:w-48"
            @click="yearly = false"
          >
            <EditableText :value="p.monthlyLabel" path="monthlyLabel" />
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="yearly"
            class="relative z-10 w-40 rounded-full px-4 py-2 @3xl:w-48"
            @click="yearly = true"
          >
            <EditableText :value="p.yearlyLabel" path="yearlyLabel" />
          </button>
        </div>
      </div>

      <div class="mt-12 grid items-stretch gap-6" :class="(p.plans?.length ?? 0) >= 3 ? '@3xl:grid-cols-3' : '@2xl:grid-cols-2'">
        <article
          v-for="(plan, i) in p.plans"
          :key="i"
          class="relative flex flex-col rounded-[2rem] p-8 transition duration-300 hover:-translate-y-1"
          :class="
            plan.highlighted
              ? 'z-10 bg-dark text-white shadow-[0_30px_80px_-20px_var(--c-primary)] @3xl:scale-105'
              : 'bg-white shadow-lg ring-1 ring-black/5 hover:shadow-xl'
          "
        >
          <span
            v-if="plan.badge"
            class="absolute -top-3 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold text-white shadow rtl:translate-x-1/2"
          >
            <EditableText :value="plan.badge" :path="`plans.${i}.badge`" />
          </span>
          <h3 class="text-lg font-bold"><EditableText :value="plan.name" :path="`plans.${i}.name`" /></h3>
          <p v-if="plan.description || editing" class="mt-1 text-sm font-light opacity-70">
            <EditableText :value="plan.description" :path="`plans.${i}.description`" />
          </p>

          <div class="mt-6 flex items-baseline gap-1">
            <span v-if="p.currency && isNumber(priceOf(plan)) && !fa" class="text-2xl font-bold opacity-80">{{ p.currency }}</span>
            <Transition
              mode="out-in"
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 -translate-y-3"
              leave-active-class="transition duration-150"
              leave-to-class="opacity-0 translate-y-3"
            >
              <span :key="priceOf(plan)" class="inline-block text-5xl font-black tracking-tight">{{ priceOf(plan) }}</span>
            </Transition>
            <span v-if="p.currency && isNumber(priceOf(plan)) && fa" class="text-lg font-bold opacity-80">{{ p.currency }}</span>
            <span v-if="plan.period" class="text-sm opacity-60">{{
              yearly && plan.yearlyPrice ? (fa ? '/سال' : '/year') : plan.period
            }}</span>
          </div>

          <ul class="mt-8 flex-1 space-y-3 text-sm">
            <li
              v-for="(f, j) in features(plan.features)"
              :key="j"
              class="flex items-start gap-2"
              :class="{ 'opacity-45 line-through decoration-1': !f.included }"
            >
              <i class="mdi mt-0.5 text-base" :class="f.included ? 'mdi-check-circle text-primary' : 'mdi-close-circle-outline'" />
              {{ f.text }}
            </li>
          </ul>
          <p v-if="editing" class="mt-3 text-[11px] opacity-60" dir="ltr">
            {{ $t('Edit features in the panel: one per line, “-” for not included.') }}
          </p>

          <a
            v-if="plan.buttonLabel"
            :href="editing ? undefined : resolveHref(plan.buttonLink, locale)"
            class="mt-8 block rounded-[var(--radius-button)] px-6 py-3 text-center text-sm font-semibold transition hover:brightness-110"
            :class="plan.highlighted ? 'bg-primary text-white' : 'bg-dark text-white'"
          >
            <EditableText :value="plan.buttonLabel" :path="`plans.${i}.buttonLabel`" />
          </a>
        </article>
      </div>
    </div>
  </section>
</template>
