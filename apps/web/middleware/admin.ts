/** Sends signed-out visitors to the login page. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return;
  const { user, fetchMe } = useAuth();
  if (!user.value && !(await fetchMe())) {
    return navigateTo({ path: '/admin/login', query: { next: to.fullPath } });
  }
});
