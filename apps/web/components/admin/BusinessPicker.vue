<script setup lang="ts">
/**
 * Picks what the site's owner is, in two plain steps (a category, then the closest kind) or by searching, and
 * collects the contact details search engines show with it. Saved as `business` in the site settings and output
 * as schema.org JSON-LD on the home page.
 */
import { businessCategories, findBusinessType, isLocalBusiness, type BusinessCategory, type BusinessInfo } from '@profiterol/blocks';

const model = defineModel<BusinessInfo>({ required: true });
const { lang, dir } = useAdminI18n();

const picking = ref(!model.value.type);
const category = ref<BusinessCategory | null>(null);
const query = ref('');

const selected = computed(() => findBusinessType(model.value.type));
const local = computed(() => isLocalBusiness(model.value.type));

/** "cafe" finds "Café", and either common spelling of the Persian ی and ک matches. */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();

const results = computed(() => {
  const q = normalize(query.value);
  if (!q) return [];
  return businessCategories.flatMap((c) =>
    c.types.filter((t) => [t.label.en, t.label.fa, t.type].some((s) => normalize(s).includes(q))).map((t) => ({ category: c, type: t })),
  );
});

function choose(type: string) {
  model.value.type = type;
  picking.value = false;
  category.value = null;
  query.value = '';
}

function clear() {
  model.value.type = '';
  picking.value = true;
}

/** Profile links, one per line in the box. */
const profiles = computed({
  get: () => model.value.sameAs.join('\n'),
  set: (text: string) => {
    model.value.sameAs = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  },
});
</script>

<template>
  <div>
    <!-- The current choice -->
    <div v-if="selected && !picking" class="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <i class="mdi text-2xl text-slate-500" :class="`mdi-${selected.category.icon}`" />
      <div class="flex-1">
        <p class="text-xs text-slate-400">{{ selected.category.label[lang] }}</p>
        <p class="font-bold">{{ selected.type.label[lang] }}</p>
      </div>
      <button type="button" class="btn-light" @click="picking = true">{{ $t('Change') }}</button>
      <button type="button" class="btn-icon hover:!text-red-600" :aria-label="$t('Remove')" @click="clear">
        <i class="mdi mdi-close" />
      </button>
    </div>

    <!-- Choosing -->
    <div v-else>
      <input v-model="query" class="input" type="search" :placeholder="$t('Search, e.g. café, dentist, lawyer…')" />

      <div v-if="query" class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="r in results"
          :key="r.type.type"
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:border-slate-900"
          @click="choose(r.type.type)"
        >
          {{ r.type.label[lang] }} <span class="text-xs text-slate-400">· {{ r.category.label[lang] }}</span>
        </button>
        <p v-if="!results.length" class="text-sm text-slate-400">
          {{ $t('Nothing found. Pick the closest category, then its “Other …” choice.') }}
        </p>
      </div>

      <div v-else-if="category" class="mt-3">
        <button type="button" class="text-sm text-slate-500 hover:text-slate-900" @click="category = null">
          <i class="mdi" :class="dir === 'rtl' ? 'mdi-arrow-right' : 'mdi-arrow-left'" /> {{ $t('All categories') }}
        </button>
        <p class="mt-2 font-bold"><i class="mdi" :class="`mdi-${category.icon}`" /> {{ category.label[lang] }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="type in category.types"
            :key="type.type"
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm hover:border-slate-900"
            :class="type.type === model.type ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'"
            @click="choose(type.type)"
          >
            {{ type.label[lang] }}
          </button>
        </div>
      </div>

      <div v-else class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="c in businessCategories"
          :key="c.key"
          type="button"
          class="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-start text-sm hover:border-slate-900"
          @click="category = c"
        >
          <i class="mdi text-xl text-slate-500" :class="`mdi-${c.icon}`" />
          {{ c.label[lang] }}
        </button>
      </div>

      <button v-if="selected" type="button" class="mt-3 text-sm text-slate-500 hover:text-slate-900" @click="picking = false">
        {{ $t('Cancel') }}
      </button>
    </div>

    <!-- Details, once a kind is chosen -->
    <div v-if="model.type" class="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label class="field-label" for="biz-phone">{{ $t('Phone') }}</label>
        <input id="biz-phone" v-model="model.phone" class="input" dir="ltr" placeholder="+98 21 1234 5678" maxlength="40" />
      </div>
      <div>
        <label class="field-label" for="biz-email">{{ $t('Email') }}</label>
        <input id="biz-email" v-model="model.email" type="email" class="input" dir="ltr" maxlength="200" />
      </div>
      <div class="sm:col-span-2">
        <label class="field-label" for="biz-street">{{ $t('Street address') }}</label>
        <input id="biz-street" v-model="model.street" class="input" dir="auto" maxlength="200" />
      </div>
      <div>
        <label class="field-label" for="biz-city">{{ $t('City') }}</label>
        <input id="biz-city" v-model="model.city" class="input" dir="auto" maxlength="100" />
      </div>
      <div>
        <label class="field-label" for="biz-region">{{ $t('Province or state') }}</label>
        <input id="biz-region" v-model="model.region" class="input" dir="auto" maxlength="100" />
      </div>
      <div>
        <label class="field-label" for="biz-postal">{{ $t('Postal code') }}</label>
        <input id="biz-postal" v-model="model.postalCode" class="input" dir="ltr" maxlength="20" />
      </div>
      <div>
        <label class="field-label" for="biz-country">{{ $t('Country') }}</label>
        <input id="biz-country" v-model="model.country" class="input" dir="auto" :placeholder="$t('e.g. IR')" maxlength="60" />
      </div>
      <div v-if="local">
        <label class="field-label" for="biz-price">{{ $t('Price range') }}</label>
        <input id="biz-price" v-model="model.priceRange" class="input" dir="auto" :placeholder="$t('e.g. $$')" maxlength="60" />
      </div>
      <div class="sm:col-span-2">
        <label class="field-label" for="biz-profiles">{{ $t('Profiles elsewhere (one link per line)') }}</label>
        <textarea
          id="biz-profiles"
          v-model.lazy="profiles"
          rows="3"
          class="input font-mono text-xs"
          dir="ltr"
          placeholder="https://instagram.com/…&#10;https://www.linkedin.com/company/…"
        />
        <p class="mt-1 text-xs text-slate-400">{{ $t('Instagram, LinkedIn, your Google Maps listing… Only https links are kept.') }}</p>
      </div>
    </div>
  </div>
</template>
