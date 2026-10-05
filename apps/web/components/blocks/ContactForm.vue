<script setup lang="ts">
/**
 * A form whose fields are set in the editor. Messages go to the admin inbox
 * (and optionally by email). The API checks every answer against the published form.
 */
import EditableText from '../site/EditableText.vue';
import type { FormField } from '~/composables/useBlockForm';

const props = defineProps<{
  p: { title: string; text: string; fields: FormField[]; submitLabel: string; successMessage: string };
  locale: string;
  /** Added by the API on published pages; missing in the editor. */
  data?: { pageId: string; blockId: string };
}>();

const fa = computed(() => props.locale === 'fa');
const { editing, values, website, sending, sent, errors, submit } = useBlockForm(props);
const choices = formChoices;

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-primary)_15%,transparent)]';
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel grid gap-10 px-6 py-10 @3xl:grid-cols-[2fr_3fr] @3xl:gap-16 @3xl:px-20 @3xl:py-16">
      <div>
        <h2 class="text-2xl font-black @3xl:text-4xl"><EditableText :value="p.title" path="title" /></h2>
        <p v-if="p.text || editing" class="mt-3 font-extralight text-muted @3xl:text-lg"><EditableText :value="p.text" path="text" multiline /></p>
      </div>

      <Transition mode="out-in" enter-active-class="transition-all duration-700" enter-from-class="opacity-0 translate-y-3">
        <div v-if="sent" key="sent" class="flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-slate-50 p-10 text-center" role="status">
          <span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-white"><i class="mdi mdi-check" /></span>
          <p class="text-lg font-medium">{{ sent }}</p>
        </div>

        <form v-else key="form" class="space-y-5" novalidate @submit.prevent="submit">
          <div v-for="(f, i) in p.fields" :key="i">
            <label :for="`f-${data?.blockId ?? 'x'}-${i}`" class="mb-1.5 block text-sm font-medium">
              <EditableText :value="f.label" :path="`fields.${i}.label`" />
              <span v-if="f.required" class="text-primary" aria-hidden="true"> *</span>
            </label>
            <textarea
              v-if="f.type === 'textarea'"
              :id="`f-${data?.blockId ?? 'x'}-${i}`"
              v-model="values[i]"
              :required="f.required"
              :placeholder="f.placeholder"
              rows="5"
              :class="inputClass"
            />
            <select v-else-if="f.type === 'select'" :id="`f-${data?.blockId ?? 'x'}-${i}`" v-model="values[i]" :required="f.required" :class="inputClass">
              <option value="" disabled>{{ f.placeholder || (fa ? 'انتخاب کنید' : 'Choose…') }}</option>
              <option v-for="o in choices(f.options)" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              :id="`f-${data?.blockId ?? 'x'}-${i}`"
              v-model="values[i]"
              :type="f.type"
              :required="f.required"
              :placeholder="f.placeholder"
              :dir="f.type === 'email' || f.type === 'tel' ? 'ltr' : undefined"
              :autocomplete="f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : undefined"
              :class="[inputClass, { 'text-end': (f.type === 'email' || f.type === 'tel') && fa }]"
            />
          </div>

          <!-- Hidden from people; bots that fill it in are ignored. -->
          <div class="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label>Website <input v-model="website" type="text" tabindex="-1" autocomplete="off" /></label>
          </div>

          <ul v-if="errors.length" class="space-y-1 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <li v-for="e in errors" :key="e">{{ e }}</li>
          </ul>

          <div class="flex flex-wrap items-center gap-4">
            <button type="submit" class="btn-pill bg-primary text-white hover:shadow-lg hover:brightness-110 disabled:opacity-60" :disabled="sending || editing || !data">
              <EditableText :value="p.submitLabel" path="submitLabel" />
              <i class="mdi" :class="sending ? 'mdi-loading mdi-spin' : 'mdi-send rtl:-scale-x-100'" />
            </button>
            <span v-if="editing" class="text-xs text-muted" dir="ltr">Messages can be sent from the published page.</span>
          </div>
        </form>
      </Transition>
    </div>
  </section>
</template>
