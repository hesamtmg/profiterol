export interface AdminUser {
  id: string;
  email: string;
  name: string;
  /** Owners manage every site (Admin → Sites) and are admins on each. */
  role: 'owner' | 'admin' | 'editor';
  /** The site this admin is for (from /auth/me). */
  site?: { id: string; name: string; primary: string; printDesigner?: boolean };
}

export function useAuth() {
  const user = useState<AdminUser | null>('auth-user', () => null);
  const api = useApi();
  const isOwner = computed(() => user.value?.role === 'owner');
  /** Admins and owners: settings, users, collections' fields. */
  const isAdmin = computed(() => user.value?.role === 'admin' || isOwner.value);
  /** The owner has allowed the sublimation designer and Print orders on this site (Admin → Sites). */
  const printDesigner = computed(() => !!user.value?.site?.printDesigner);

  async function login(email: string, password: string) {
    const res = await api<{ user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      headers: { 'x-session': 'cookie' },
    });
    user.value = res.user;
    // The login answer has no site details; /auth/me does.
    await fetchMe();
  }

  async function fetchMe() {
    // Without the readable half of the session there is no session; skip the request.
    if (import.meta.client && !document.cookie.includes('pt_csrf=')) return null;
    try {
      user.value = await api<AdminUser>('/auth/me');
    } catch {
      user.value = null;
    }
    return user.value;
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    user.value = null;
    return navigateTo('/admin/login');
  }

  return { user, isAdmin, isOwner, printDesigner, login, fetchMe, logout };
}
