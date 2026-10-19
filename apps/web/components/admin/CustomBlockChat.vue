<script setup lang="ts">
/**
 * The block builder's conversation with the AI: the saved requests and answers, then the request in progress (the
 * admin's message at once, and what the AI is doing while they wait) or how it failed.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string;
  author?: string;
  model?: string;
  attachments?: { name: string; kind: 'image' | 'pdf' | 'text'; thumb?: string }[];
}

/** What the API reports of a request in progress (apps/api/src/custom-blocks/custom-blocks.service.ts AiStep). */
export type AiStep =
  | { kind: 'asking'; at: string; round: number; rounds: number; model: string }
  | { kind: 'problems'; at: string; round: number; summary: string; problems: string[] };

export interface PendingRequest {
  text: string;
  files: string[];
  startedAt: number;
  steps: AiStep[];
  error?: string;
}

const props = defineProps<{ messages: ChatMessage[]; pending?: PendingRequest | null }>();

// The waiting time, counted up every second while the AI works.
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
watch(
  () => Boolean(props.pending && !props.pending.error),
  (waiting) => {
    clearInterval(timer);
    if (waiting) timer = setInterval(() => (now.value = Date.now()), 1000);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearInterval(timer));

const elapsed = computed(() => {
  const s = Math.max(0, Math.round((now.value - (props.pending?.startedAt ?? now.value)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});
const asking = computed(() => [...(props.pending?.steps ?? [])].reverse().find((s) => s.kind === 'asking'));
const fixes = computed(() => props.pending?.steps.filter((s) => s.kind === 'problems') ?? []);

// The newest message stays in view.
const listEl = ref<HTMLElement>();
watch(
  () => [props.messages.length, props.pending?.steps.length, props.pending?.error],
  () => nextTick(() => listEl.value?.scrollTo({ top: listEl.value.scrollHeight })),
  { immediate: true },
);
</script>

<template>
  <ol ref="listEl" class="flex-1 space-y-2 overflow-y-auto" aria-live="polite">
    <li
      v-for="(m, i) in messages"
      :key="i"
      class="rounded-2xl px-3 py-2 text-sm"
      :class="m.role === 'user' ? 'ms-6 bg-slate-100' : 'me-6 bg-[#00a998]/10'"
    >
      <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {{ m.role === 'user' ? (m.author ?? $t('You')) : m.model ? `${$t('AI')} · ${m.model}` : $t('AI') }}
      </span>
      {{ m.text }}
      <span v-if="m.attachments?.length" class="mt-1.5 flex flex-wrap gap-1.5">
        <span
          v-for="a in m.attachments"
          :key="a.name"
          class="flex max-w-full items-center gap-1 rounded-lg bg-white/70 p-1 pe-2 text-xs text-slate-600"
          :title="a.name"
        >
          <img v-if="a.thumb" :src="a.thumb" alt="" class="h-10 w-10 rounded-md object-cover" />
          <i v-else class="mdi text-base" :class="a.kind === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-file-document-outline'" />
          <span class="truncate">{{ a.name }}</span>
        </span>
      </span>
    </li>

    <template v-if="pending">
      <li class="ms-6 rounded-2xl bg-slate-100 px-3 py-2 text-sm" data-pending="request">
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('You') }}</span>
        {{ pending.text }}
        <span v-if="pending.files.length" class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="name in pending.files"
            :key="name"
            class="flex max-w-full items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-xs text-slate-600"
          >
            <i class="mdi mdi-paperclip" /> <span class="truncate">{{ name }}</span>
          </span>
        </span>
      </li>
      <li
        class="me-6 rounded-2xl px-3 py-2 text-sm"
        :class="pending.error ? 'bg-red-50 text-red-700' : 'bg-[#00a998]/10'"
        :data-pending="pending.error ? 'failed' : 'working'"
      >
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {{ asking ? `${$t('AI')} · ${asking.model}` : $t('AI') }}
        </span>
        <p v-for="(f, i) in fixes" :key="i" class="mb-1.5 text-xs text-slate-600">
          <i class="mdi mdi-alert-circle-outline text-amber-600" />
          {{ $t('Try {round}: the checks found problems, so the AI is fixing them:', { round: f.round }) }}
          <span v-for="p in f.problems" :key="p" class="block ps-4" dir="auto">• {{ p }}</span>
        </p>
        <span v-if="pending.error" class="whitespace-pre-line">{{ pending.error }}</span>
        <span v-else class="flex items-center gap-2">
          <i class="mdi mdi-loading mdi-spin" />
          <span>
            {{
              asking && asking.round > 1
                ? $t('Fixing the block (try {round} of {rounds})…', { round: asking.round, rounds: asking.rounds })
                : $t('Building the block…')
            }}
          </span>
          <span class="ms-auto tabular-nums text-xs text-slate-500" dir="ltr">{{ elapsed }}</span>
        </span>
      </li>
    </template>
  </ol>
</template>
