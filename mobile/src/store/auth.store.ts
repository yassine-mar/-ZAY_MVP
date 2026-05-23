import { create } from 'zustand';
import type { User } from '@/types/domain.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setHydrated: () => void;
  reset: () => void;
}

/**
 * Auth store — in-memory only. The token is persisted separately via
 * tokenStorage (SecureStore). The user is re-fetched from GET /users/me
 * on every cold start; we do NOT persist it to disk to avoid stale-data
 * issues after admin-side role/status changes.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  setHydrated: () => set({ isHydrated: true }),
  reset: () => set({ user: null, token: null, isAuthenticated: false }),
}));
