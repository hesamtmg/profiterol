interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

export function useAuth() {
  const token = useCookie<string | null>('pt_token', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  const user = useState<AdminUser | null>('auth-user', () => null);
  const api = useApi();

  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    token.value = res.token;
    user.value = res.user;
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      user.value = await api<AdminUser>('/auth/me');
    } catch {
      token.value = null;
      user.value = null;
    }
    return user.value;
  }

  function logout() {
    token.value = null;
    user.value = null;
    return navigateTo('/admin/login');
  }

  return { token, user, login, fetchMe, logout };
}
