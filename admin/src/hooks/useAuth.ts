import { useAuthStore } from '@/store/auth.store';

/**
 * Convenience selector. Subscribes only to the auth slice you actually use,
 * so unrelated re-renders don't fire.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const reset = useAuthStore((s) => s.reset);
  return { user, token, isAuthenticated, setAuth, logout: reset };
}
