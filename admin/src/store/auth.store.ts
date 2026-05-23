import { create } from 'zustand';
import type { AdminUser } from '@/types/domain.types';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string) => void;
  reset: () => void;
}

/**
 * Auth store — token in memory only, never localStorage (per architecture §5).
 * Browser refresh wipes the token; the admin re-logs in. This is the deliberate
 * security trade-off for a tool that can approve sellers and cancel orders.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: (user, token) =>
    set({ user, token, isAuthenticated: true }),
  reset: () =>
    set({ user: null, token: null, isAuthenticated: false }),
}));
