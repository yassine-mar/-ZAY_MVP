import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client.
 * Defaults are tuned for a mobile app on cellular networks:
 *   - staleTime keeps the UI feeling instant after re-entering a screen
 *   - retry is conservative — we'd rather show an error fast than wait
 *   - mutations never retry (idempotency is opt-in per call)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
