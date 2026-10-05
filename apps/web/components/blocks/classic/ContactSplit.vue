<script setup lang="ts">
/**
 * minicms kind 7: a photo beside a contact form on frosted glass, with the address and email.
 * Messages go to the admin inbox, like the Contact form block.
 */
import EditableText from '../../site/EditableText.vue';
import type { FormField } from '~/composables/useBlockForm';

const props = defineProps<{
  p: {
    image: string;
    title: string;
    text: string;
    address: string;
    email: string;
    phone: string;
    fields: FormField[];
    submitLabel: string;
    successMessage: string;
  };
  locale: string;
  /** Added by the API on published pages; missing in the editor. */
  data?: { pageId: string; blockId: string };
}>();

const fa = computed(() => props.locale === 'fa');
const { editing, values, website, sending, sent, errors, submit } = useBlockForm(props);
const words = computed(() => String(props.p.title ?? '').split(/\s+/).filter(Boolean));

const inputClass =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all duration-300 focus:ring-2 @3xl:px-4 @3xl:py-2.5';
const inputStyle = {
  background: 'rgb(255 255 255 / 0.2)',
  borderColor: 'color-mix(in srgb, var(--c-primary) 70%, transparent)',
  '--tw-ring-color': 'color-mix(in srgb, var(--c-primary) 30%, transparent)',
};
</script>

<template>
  <section class="flex w-full flex-col bg-surface text-ink @3xl:min-h-[90dvh] @3xl:flex-row-reverse">
    <div class="relative hidden @3xl:block @3xl:w-1/2">
      <img v-if="p.image" :src="p.image" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
      <div v-else class="photo-placeholder absolute inset-0" />
    </div>

    <div class="flex w-full flex-col items-center justify-center gap-3 p-4 pt-16 @3xl:w-1/2 @3xl:p-8">
      <div v-reveal class="flex w-full items-center justify-center gap-2 text-center">
        <h2 v-if="editing" class="text-3xl font-medium @3xl:text-5xl"><EditableText :value="p.title" path="title" /></h2>
        <template v-else>
          <h2 class="text-3xl font-medium @3xl:text-5xl @5xl:text-6xl">{{ words.slice(0, 2).join(' ') }}</h2>
          <div v-if="words.length > 2" class="text-start text-base leading-tight @3xl:text-xl">
            <p v-for="(w, i) in words.slice(2)" :key="i">{{ w }}</p>
          </div>
        </template>
      </div>

      <p v-if="p.text || editing" v-reveal="{ delay: 100 }" class="w-full max-w-2xl text-sm font-extralight @3xl:text-base">
        <EditableText :value="p.text" path="text" multiline />
      </p>

      <ul v-if="p.address || p.email || p.phone || editing" class="w-full max-w-2xl space-y-1 text-xs @3xl:text-base">
        <li v-if="p.address || editing" class="flex items-start gap-2">
          <i class="mdi mdi-map-marker-outline text-primary" /><EditableText :value="p.address" path="address" placeholder="Address" multiline />
        </li>
        <li v-if="p.email" class="flex items-center gap-2">
          <i class="mdi mdi-email-outline text-primary" /><a :href="`mailto:${p.email}`" dir="ltr" class="hover:underline">{{ p.email }}</a>
        </li>
        <li v-if="p.phone" class="flex items-center gap-2">
          <i class="mdi mdi-phone-outline text-primary" /><a :href="`tel:${p.phone.replace(/\s/g, '')}`" dir="ltr" class="hover:underline">{{ p.phone }}</a>
        </li>
      </ul>

      <Transition mode="out-in" enter-active-class="transition-all duration-700" enter-from-class="opacity-0 translate-y-3">
        <div
          v-if="sent"
          key="sent"
          class="glass flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl px-6 py-10 text-center"
          role="status"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white"><i class="mdi mdi-check" /></span>
          <p class="font-semibold">{{ sent }}</p>
        </div>

        <form
          v-else
          key="form"
          v-reveal="{ delay: 200 }"
          class="w-full max-w-2xl rounded-xl border-2 px-4 py-6 shadow-lg backdrop-blur-md transition-all duration-300 @3xl:px-6"
          style="background: rgb(255 255 255 / 0.05); border-color: color-mix(in srgb, var(--c-primary) 40%, transparent)"
          novalidate
          @submit.prevent="submit"
        >
          <div class="grid grid-cols-1 gap-1 @xl:grid-cols-2">
            <div v-for="(f, i) in p.fields" :key="i" class="m-1" :class="{ '@xl:col-span-2': f.type === 'textarea' }">
              <label :for="`cs-${data?.blockId ?? 'x'}-${i}`" class="mb-1.5 block text-xs font-semibold @3xl:text-sm">
                <EditableText :value="f.label" :path="`fields.${i}.label`" />
                <span v-if="f.required" class="text-primary" aria-hidden="true"> *</span>
              </label>
              <textarea
                v-if="f.type === 'textarea'"
                :id="`cs-${data?.blockId ?? 'x'}-${i}`"
                v-model="values[i]"
                :required="f.required"
                :placeholder="f.placeholder"
                rows="3"
                :class="inputClass"
                class="min-h-[100px] resize-none"
                :style="inputStyle"
              />
              <select
                v-else-if="f.type === 'select'"
                :id="`cs-${data?.blockId ?? 'x'}-${i}`"
                v-model="values[i]"
                :required="f.required"
                :class="inputClass"
                :style="inputStyle"
              >
                <option value="" disabled>{{ f.placeholder || (fa ? 'انتخاب کنید' : 'Choose…') }}</option>
                <option v-for="o in formChoices(f.options)" :key="o" :value="o">{{ o }}</option>
              </select>
              <input
                v-else
                :id="`cs-${data?.blockId ?? 'x'}-${i}`"
                v-model="values[i]"
                :type="f.type"
                :required="f.required"
                :placeholder="f.placeholder"
                :dir="f.type === 'email' || f.type === 'tel' ? 'ltr' : undefined"
                :autocomplete="f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : undefined"
                :class="[inputClass, { 'text-end': (f.type === 'email' || f.type === 'tel') && fa }]"
                :style="inputStyle"
              />
            </div>
          </div>

          <!-- Hidden from people; bots that fill it in are ignored. -->
          <div class="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label>Website <input v-model="website" type="text" tabindex="-1" autocomplete="off" /></label>
          </div>

          <ul v-if="errors.length" class="mx-1 mt-3 space-y-1 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <li v-for="e in errors" :key="e">{{ e }}</li>
          </ul>

          <div class="mt-6 flex flex-col items-center gap-2">
            <button
              type="submit"
              class="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-500 hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-60 @3xl:px-8 @3xl:py-3 @3xl:text-base"
              :disabled="sending || editing || !data"
            >
              <EditableText :value="p.submitLabel" path="submitLabel" />
              <i v-if="sending" class="mdi mdi-loading mdi-spin ms-1" />
            </button>
            <span v-if="editing" class="text-xs text-muted" dir="ltr">{{ $t('Messages can be sent from the published page.') }}</span>
          </div>
        </form>
      </Transition>
    </div>
  </section>
</template>
