import { QueryClient } from '@tanstack/react-query';

/**
 * Fresh QueryClient per test — never reuse instances across tests.
 * Retries off and gcTime large so tests are deterministic.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
