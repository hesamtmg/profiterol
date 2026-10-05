<script setup lang="ts">
import AdminLangSwitch from '~/components/admin/AdminLangSwitch.vue';
const { user, logout } = useAuth();
const route = useRoute();

const nav = [
  { to: '/admin', label: 'Pages', icon: 'mdi-file-document-multiple-outline' },
  { to: '/admin/collections', label: 'Collections', icon: 'mdi-view-dashboard-variant-outline' },
  { to: '/admin/inbox', label: 'Inbox', icon: 'mdi-inbox-outline' },
  { to: '/admin/media', label: 'Media', icon: 'mdi-image-multiple-outline' },
  { to: '/admin/settings', label: 'Site settings', icon: 'mdi-palette-outline' },
  { to: '/admin/users', label: 'Users', icon: 'mdi-account-multiple-outline', admin: true },
];
const visibleNav = computed(() => nav.filter((item) => !item.admin || user.value?.role === 'admin'));

// Unread form messages, shown as a badge on Inbox. The inbox page keeps it up to date.
const api = useApi();
const unread = useState<number>('inbox-unread', () => 0);
async function refreshUnread() {
  try {
    unread.value = (await api<{ count: number }>('/admin/submissions/unread-count')).count;
  } catch {
    // Not critical; leave the badge as it is.
  }
}
watch(() => route.path, refreshUnread, { immediate: true });

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to);
}

const { lang, dir, t } = useAdminI18n();
useHead(() => ({ title: t('Profiterol admin'), htmlAttrs: { lang: lang.value, dir: dir.value } }));
</script>

<template>
  <div class="admin-ui min-h-screen bg-slate-100 text-slate-800">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
        <NuxtLink to="/admin" class="flex items-center gap-2 text-lg font-black">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00a998] text-white">{{ $t('P') }}</span>
          {{ $t('Profiterol') }}
        </NuxtLink>
        <nav class="flex gap-1">
          <NuxtLink
            v-for="item in visibleNav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
            :class="isActive(item.to) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
          >
            <i class="mdi" :class="item.icon" />
            <span class="hidden whitespace-nowrap sm:inline">{{ $t(item.label) }}</span>
            <span
              v-if="item.to === '/admin/inbox' && unread"
              class="rounded-full bg-[#00a998] px-1.5 text-[10px] font-bold leading-4 text-white"
              :aria-label="$t('{n} unread', { n: unread })"
            >
              {{ unread }}
            </span>
          </NuxtLink>
        </nav>
        <div class="ms-auto flex items-center gap-3 text-sm">
          <AdminLangSwitch />
          <a href="/" target="_blank" class="hidden whitespace-nowrap text-slate-500 hover:text-slate-900 sm:inline">
            <i class="mdi mdi-open-in-new" /> {{ $t('View site') }}
          </a>
          <NuxtLink to="/admin/account" class="hidden text-slate-400 hover:text-slate-900 md:inline" :title="$t('Your account')">{{ user?.email }}</NuxtLink>
          <button type="button" class="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100" @click="logout">
            <i class="mdi mdi-logout" /> {{ $t('Log out') }}
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-5 py-8">
      <slot />
    </main>
  </div>
</template>
