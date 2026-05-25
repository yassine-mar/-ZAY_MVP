import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { notificationsService } from '@/services/notifications.service';

/**
 * Mounts once inside an authenticated tree (CustomerRoot / SellerRoot).
 *
 * Strategy:
 *   - Never prompt on cold start (~70% rejection rate per the architecture
 *     critique). Silently register the token IF permission was already
 *     granted previously.
 *   - User-facing prompts (after first order, after seller approval, etc.)
 *     call `notificationsService.requestPermissionAndRegister()` directly.
 */
export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    void notificationsService.registerTokenIfPossible();
  }, [isAuthenticated]);
}
