<script setup lang="ts">
import AdminLangSwitch from '~/components/admin/AdminLangSwitch.vue';
const { user, logout } = useAuth();
const route = useRoute();

const nav = [
  { to: '/admin', label: 'Pages', icon: 'mdi-file-document-multiple-outline' },
  { to: '/admin/collections', label: 'Collections', icon: 'mdi-view-dashboard-variant-outline' },
  { to: '/admin/inbox', label: 'Inbox', icon: 'mdi-inbox-outline' },
  { to: '/admin/designs', label: 'Print orders', icon: 'mdi-tshirt-crew-outline' },
  { to: '/admin/media', label: 'Media', icon: 'mdi-image-multiple-outline' },
  { to: '/admin/settings', label: 'Site settings', icon: 'mdi-palette-outline' },
  { to: '/admin/redirects', label: 'Redirects', icon: 'mdi-directions-fork' },
  { to: '/admin/users', label: 'Users', icon: 'mdi-account-multiple-outline', admin: true },
  { to: '/admin/sites', label: 'Sites', icon: 'mdi-web', owner: true },
];
const { isAdmin, isOwner } = useAuth();
const visibleNav = computed(() => nav.filter((item) => (!item.admin || isAdmin.value) && (!item.owner || isOwner.value)));

// Unread form messages and new print designs, shown as badges on Inbox and Print orders. Their pages keep them up to date.
const api = useApi();
const unread = useState<number>('inbox-unread', () => 0);
const newDesigns = useState<number>('designs-new', () => 0);
async function refreshUnread() {
  try {
    [unread.value, newDesigns.value] = (
      await Promise.all([api<{ count: number }>('/admin/submissions/unread-count'), api<{ count: number }>('/admin/designs/new-count')])
    ).map((r) => r.count);
  } catch {
    // Not critical; leave the badges as they are.
  }
}
const badge = (to: string) => (to === '/admin/inbox' ? unread.value : to === '/admin/designs' ? newDesigns.value : 0);
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
      <div class="mx-auto flex max-w-7xl items-center gap-6 px-5 pt-3">
        <NuxtLink to="/admin" class="flex shrink-0 items-center gap-2 text-lg font-black">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00a998] text-white">{{ $t('P') }}</span>
          {{ $t('Profiterol') }}
        </NuxtLink>
        <div class="ms-auto flex min-w-0 items-center gap-3 text-sm">
          <NuxtLink
            v-if="isOwner && user?.site"
            to="/admin/sites"
            class="hidden max-w-48 truncate rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 lg:inline"
            :title="$t('You are editing this site. Switch in Sites.')"
          >
            <i class="mdi mdi-web" /> {{ user.site.name || user.site.primary }}
          </NuxtLink>
          <AdminLangSwitch />
          <a href="/" target="_blank" class="hidden whitespace-nowrap text-slate-500 hover:text-slate-900 sm:inline">
            <i class="mdi mdi-open-in-new" /> {{ $t('View site') }}
          </a>
          <NuxtLink
            to="/admin/account"
            class="hidden min-w-0 truncate text-slate-400 hover:text-slate-900 md:inline"
            :title="$t('Your account')"
            >{{ user?.email }}</NuxtLink
          >
          <button type="button" class="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100" @click="logout">
            <i class="mdi mdi-logout" /> {{ $t('Log out') }}
          </button>
        </div>
      </div>
      <!-- Nav gets its own row so it never pushes the page wider than the screen; on narrow screens it scrolls by itself. -->
      <nav class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-2">
        <NuxtLink
          v-for="item in visibleNav"
          :key="item.to"
          :to="item.to"
          class="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm transition lg:px-4"
          :class="isActive(item.to) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
          :title="$t(item.label)"
        >
          <i class="mdi" :class="item.icon" />
          <span class="hidden whitespace-nowrap md:inline">{{ $t(item.label) }}</span>
          <span
            v-if="badge(item.to)"
            class="rounded-full bg-[#00a998] px-1.5 text-[10px] font-bold leading-4 text-white"
            :aria-label="$t(item.to === '/admin/inbox' ? '{n} unread' : '{n} new', { n: badge(item.to) })"
          >
            {{ badge(item.to) }}
          </span>
        </NuxtLink>
      </nav>
    </header>
    <main class="mx-auto max-w-7xl px-5 py-8">
      <slot />
    </main>
  </div>
</template>
