<script setup lang="ts">
/**
 * minicms kind 10: an uploaded video in its own player (seek bar, volume, ±5 s, speed, full screen),
 * floating on a blurred glow of itself. Narrow screens get the phone version when there is one.
 */
const props = defineProps<{ p: { video: string; poster: string; mobileVideo: string; mobilePoster: string }; locale: string }>();
const editing = Boolean(useBlockEditing());

const root = ref<HTMLElement | null>(null);
const box = ref<HTMLElement | null>(null);
const video = ref<HTMLVideoElement | null>(null);
const small = ref(false);
const playing = ref(false);
const current = ref(0);
const duration = ref(0);
const volume = ref(1);
const muted = ref(false);
const speed = ref(1);
const speedMenu = ref(false);
const controlsVisible = ref(true);
const fullscreen = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let resize: ResizeObserver | undefined;

const src = computed(() => (small.value && props.p.mobileVideo ? props.p.mobileVideo : props.p.video));
const poster = computed(() => (small.value && props.p.mobilePoster ? props.p.mobilePoster : props.p.poster) || undefined);
const progress = computed(() => (duration.value ? (current.value / duration.value) * 100 : 0));
const speeds = [2, 1.5, 1, 0.75, 0.5];

function time(s: number) {
  if (!Number.isFinite(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

function toggle() {
  const v = video.value;
  if (!v || editing) return;
  if (v.paused) v.play().catch(() => undefined);
  else v.pause();
}

/** Reads the length; also on mount, because a server-rendered video may load it before Vue listens. */
function readDuration() {
  const d = video.value?.duration ?? 0;
  duration.value = Number.isFinite(d) ? d : 0;
}

function skip(seconds: number) {
  const v = video.value;
  if (!v) return;
  const end = duration.value || v.duration;
  v.currentTime = Math.max(v.currentTime + seconds, 0);
  if (Number.isFinite(end) && v.currentTime > end) v.currentTime = end;
}

function seek(e: Event) {
  if (video.value) video.value.currentTime = (Number((e.target as HTMLInputElement).value) / 100) * duration.value;
}

function setVolume(e: Event) {
  if (!video.value) return;
  video.value.volume = Number((e.target as HTMLInputElement).value);
  video.value.muted = video.value.volume === 0;
}

function toggleMute() {
  if (!video.value) return;
  video.value.muted = !video.value.muted;
  if (!video.value.muted && video.value.volume === 0) video.value.volume = 0.5;
}

function setSpeed(s: number) {
  if (video.value) video.value.playbackRate = s;
  speed.value = s;
  speedMenu.value = false;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else box.value?.requestFullscreen?.();
}

/** Controls stay while paused; while playing they hide after 3 s without the mouse moving. */
function wake() {
  controlsVisible.value = true;
  clearTimeout(hideTimer);
  if (playing.value) hideTimer = setTimeout(() => (controlsVisible.value = speedMenu.value), 3000);
}

function onKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'k') toggle();
  else if (e.key === 'ArrowRight') skip(document.documentElement.dir === 'rtl' ? -5 : 5);
  else if (e.key === 'ArrowLeft') skip(document.documentElement.dir === 'rtl' ? 5 : -5);
  else if (e.key === 'f') toggleFullscreen();
  else if (e.key === 'm') toggleMute();
  else return;
  e.preventDefault();
  wake();
}

function onFullscreenChange() {
  fullscreen.value = document.fullscreenElement === box.value;
}

watch(playing, wake);

onMounted(() => {
  resize = new ResizeObserver(([entry]) => (small.value = entry.contentRect.width < 768));
  if (root.value) resize.observe(root.value);
  readDuration();
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(() => {
  resize?.disconnect();
  clearTimeout(hideTimer);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<template>
  <section ref="root" class="relative flex w-full items-center justify-center overflow-hidden bg-surface px-5 py-20 @3xl:px-[12%] @3xl:py-32" dir="ltr">
    <!-- The glow: the same video, heavily blurred -->
    <video
      v-if="src"
      :src="src"
      :poster="poster"
      muted
      playsinline
      preload="metadata"
      aria-hidden="true"
      tabindex="-1"
      class="pointer-events-none absolute aspect-video w-4/5 opacity-50"
      style="filter: blur(100px)"
    />

    <div
      ref="box"
      class="group relative aspect-video w-full select-none overflow-hidden bg-black"
      :class="fullscreen ? 'h-screen rounded-none' : 'rounded-[5px]'"
      tabindex="0"
      role="region"
      aria-label="Video player"
      @mousemove="wake"
      @keydown="onKey"
    >
      <video
        v-if="src"
        ref="video"
        :src="src"
        :poster="poster"
        playsinline
        preload="metadata"
        class="h-full w-full"
        @click="toggle"
        @play="playing = true"
        @pause="playing = false"
        @timeupdate="current = video?.currentTime ?? 0"
        @loadedmetadata="readDuration"
        @durationchange="readDuration"
        @volumechange="(volume = video?.volume ?? 1), (muted = video?.muted ?? false)"
      />
      <div v-else class="photo-placeholder flex h-full w-full items-center justify-center text-white/80">
        <i class="mdi mdi-play-circle-outline text-7xl" />
      </div>

      <!-- Big play button while paused -->
      <button
        v-if="src && !playing"
        type="button"
        class="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-4xl text-white backdrop-blur transition hover:scale-110 @3xl:h-20 @3xl:w-20"
        aria-label="Play"
        @click="toggle"
      >
        <i class="mdi mdi-play" />
      </button>

      <!-- Controls -->
      <div
        v-if="src"
        class="absolute inset-x-0 z-10 bg-gradient-to-t from-black/70 to-transparent pt-8 text-white transition-all duration-150"
        :class="controlsVisible || !playing ? 'bottom-0 opacity-100' : '-bottom-4 opacity-0'"
      >
        <div class="group/seek relative px-0">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progress"
            class="seek block w-full"
            :style="{ '--seek': `${progress}%` }"
            aria-label="Seek"
            @input="seek"
          />
        </div>
        <div class="flex items-center justify-between px-3 pb-2 pt-1 @3xl:px-5">
          <div class="flex flex-1 items-center gap-1">
            <button type="button" class="ctl" :aria-label="muted ? 'Unmute' : 'Mute'" @click="toggleMute">
              <i class="mdi" :class="muted || volume === 0 ? 'mdi-volume-off' : volume < 0.5 ? 'mdi-volume-medium' : 'mdi-volume-high'" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="any"
              :value="muted ? 0 : volume"
              class="hidden w-20 accent-white @xl:block"
              aria-label="Volume"
              @input="setVolume"
            />
            <span class="ms-2 whitespace-nowrap text-xs tabular-nums @3xl:text-sm">{{ time(current) }} / {{ time(duration) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="ctl" aria-label="Back 5 seconds" @click="skip(-5)"><i class="mdi mdi-rewind-5" /></button>
            <button type="button" class="ctl" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle">
              <i class="mdi" :class="playing ? 'mdi-pause' : 'mdi-play'" />
            </button>
            <button type="button" class="ctl" aria-label="Forward 5 seconds" @click="skip(5)"><i class="mdi mdi-fast-forward-5" /></button>
          </div>
          <div class="flex flex-1 items-center justify-end gap-1">
            <div class="relative">
              <button type="button" class="ctl" aria-label="Playback speed" :aria-expanded="speedMenu" @click="speedMenu = !speedMenu">
                <i class="mdi mdi-play-speed" />
              </button>
              <ul v-if="speedMenu" class="absolute bottom-11 left-1/2 w-24 -translate-x-1/2 overflow-hidden rounded bg-white py-1 text-sm text-black shadow-lg" role="menu">
                <li v-for="s in speeds" :key="s" role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    :aria-checked="speed === s"
                    class="block w-full px-4 py-1.5 text-start hover:bg-slate-200"
                    :class="{ 'bg-primary text-white hover:bg-primary': speed === s }"
                    @click="setSpeed(s)"
                  >
                    {{ s === 1 ? 'Normal' : `${s}x` }}
                  </button>
                </li>
              </ul>
            </div>
            <button type="button" class="ctl" :aria-label="fullscreen ? 'Exit full screen' : 'Full screen'" @click="toggleFullscreen">
              <i class="mdi" :class="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ctl {
  display: flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 1.25rem;
  transition: background-color 0.15s;
}
.ctl:hover,
.ctl:focus-visible {
  background: rgb(255 255 255 / 0.15);
}
</style>
