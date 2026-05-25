import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Drives the bell-icon badge.
 *   - Polls every 60s while focused (cheap query: COUNT(*) WHERE is_read=FALSE)
 *   - Auto-pauses when no auth (post-logout)
 *   - Returns 0 on error so the badge never throws
 */
export function useUnreadNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
    enabled: isAuthenticated,
  });

  return {
    count: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
  };
}
