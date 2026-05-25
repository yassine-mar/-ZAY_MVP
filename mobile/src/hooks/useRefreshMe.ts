import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Re-fetch /users/me periodically and push the latest user into the auth
 * store. Used by PendingApprovalScreen so the seller doesn't need a
 * notification or pull-to-refresh to discover their account was approved
 * (Critique Issue #1).
 *
 * Stops polling when the screen blurs to avoid draining battery.
 */
export function useRefreshMe(opts: { intervalMs?: number } = {}) {
  const isFocused = useIsFocused();
  const intervalMs = opts.intervalMs ?? 60_000;

  const query = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.getMe(),
    refetchInterval: isFocused ? intervalMs : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (query.data?.user) {
      useAuthStore.getState().setUser(query.data.user);
    }
  }, [query.data]);

  return query;
}
