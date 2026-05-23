import { QueryClient } from '@tanstack/react-query';

/**
 * Defaults aligned with @ZAY operational patterns (per admin architecture doc §7).
 *  - 30s staleTime: stale on focus, refetch when the admin tab regains focus.
 *  - retry: 1 — admins want fast feedback, not network resilience theatre.
 *  - mutations never auto-retry — irreversible actions (suspend, cancel) must be deliberate.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
