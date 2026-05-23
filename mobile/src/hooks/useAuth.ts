import { useAuthStore } from '@/store/auth.store';

/**
 * Lightweight selector hook so screens don't import the zustand store
 * directly. Returning the whole slice is fine — zustand uses shallow
 * equality only when a selector is passed.
 */
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    token: s.token,
    isAuthenticated: s.isAuthenticated,
    isHydrated: s.isHydrated,
  }));
}
