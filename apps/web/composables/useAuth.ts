interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

export function useAuth() {
  const user = useState<AdminUser | null>('auth-user', () => null);
  const api = useApi();

  async function login(email: string, password: string) {
    const res = await api<{ user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      headers: { 'x-session': 'cookie' },
    });
    user.value = res.user;
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

  return { user, login, fetchMe, logout };
}
