import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usersApi } from '@/api/users.api';
import { navigationRef } from '@/navigation/navigationRef';
import { useAuthStore } from '@/store/auth.store';
import { queryClient } from '@/lib/queryClient';
import {
  resolveDeepLink,
  type DeepLinkTarget,
  type Notification as NotificationRow,
  type NotificationType,
} from '@/constants/notificationTypes';
import { FCM_TOKEN_STORAGE_KEY } from '@/constants/api';

/**
 * @ZAY mobile push notifications — orchestration layer.
 *
 * Lifecycle (one source of truth, called from auth.service.ts):
 *   1. After login/hydrate: registerForPush() if permission already granted
 *   2. From a user-facing prompt: requestPermissionAndRegister()
 *   3. On logout: clearLocalToken() + DELETE /users/me/fcm-token
 *
 * Token storage:
 *   - The token is NOT sensitive (it's an opaque identifier, not credentials).
 *     AsyncStorage is fine; SecureStore is unnecessary.
 *   - We store it locally so we can detect token *changes* and avoid
 *     hammering the backend with no-op PATCH requests on every launch.
 *
 * Multi-device limitation:
 *   - users.fcm_token is a single column on the server.
 *   - Logging in on phone B silently unregisters phone A.
 *   - A `user_devices` table with one row per device is the Phase-2 fix.
 */

/* ── Foreground display handler ────────────────────────────────────────── */

/**
 * Tells the OS what to do with notifications that arrive WHILE the app is
 * in the foreground. We let the OS render the banner (more discoverable
 * than a custom Toast) AND set the badge.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/* ── Permission + token registration ──────────────────────────────────── */

interface PermissionResult {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

export const notificationsService = {
  /** Check current permission status without prompting. */
  async checkPermission(): Promise<PermissionResult> {
    const settings = await Notifications.getPermissionsAsync();
    return {
      status:
        settings.status === 'granted'
          ? 'granted'
          : settings.status === 'undetermined'
          ? 'undetermined'
          : 'denied',
      canAskAgain: settings.canAskAgain ?? true,
    };
  },

  /**
   * OS prompt → get token if granted → PATCH backend. Returns `true` if
   * push is now enabled. Caller is responsible for choosing a good
   * *moment* to prompt (e.g. after the user's first order).
   */
  async requestPermissionAndRegister(): Promise<boolean> {
    if (!Device.isDevice) return false; // simulators can't receive pushes
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });
    if (status !== 'granted') return false;
    await this.registerTokenIfPossible();
    return true;
  },

  /**
   * Register the FCM token with the backend if (and only if) we already
   * have permission. Idempotent + cheap — safe to call on every cold start.
   */
  async registerTokenIfPossible(): Promise<string | null> {
    if (!Device.isDevice) return null;
    if (!useAuthStore.getState().isAuthenticated) return null;

    const perm = await this.checkPermission();
    if (perm.status !== 'granted') return null;

    try {
      // Android channel — required on API 26+ for foreground/heads-up.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Order updates',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E8520A',
        });
      }

      // Native FCM/APNS token — required for firebase-admin.send() backend.
      // Expo's getDevicePushTokenAsync returns the FCM token on Android and
      // the APNS token on iOS (Firebase forwards APNS → FCM internally).
      const { data: token } = await Notifications.getDevicePushTokenAsync();
      if (!token) return null;

      const previousToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (previousToken === token) return token; // server already has it

      await usersApi.setFcmToken(token);
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      return token;
    } catch (err) {
      // Don't crash — push is a non-essential capability.
      // eslint-disable-next-line no-console
      console.warn('[notifications] register failed', err);
      return null;
    }
  },

  /**
   * Called from auth.service.logout(). Best-effort: we always wipe the
   * local cache; the server call is fired-and-forgotten by usersApi.
   */
  async clearLocalToken(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY),
      usersApi.clearFcmToken(),
      Notifications.setBadgeCountAsync(0).catch(() => undefined),
    ]);
  },

  /* ── Tap routing ─────────────────────────────────────────────────────── */

  /**
   * Convert a raw notification payload (received via push or in-app) into
   * a deep-link target, then navigate. Safe to call from any thread.
   */
  routeToNotification(payload: {
    type?: string;
    order_id?: string | null;
    data?: Record<string, unknown> | null;
  }) {
    const user = useAuthStore.getState().user;
    if (!user || !navigationRef.isReady()) return;

    const fakeRow: Pick<NotificationRow, 'type' | 'order_id' | 'data'> = {
      type: (payload.type as NotificationType) ?? 'system',
      order_id: payload.order_id ?? null,
      data: payload.data ?? null,
    };

    const target = resolveDeepLink(fakeRow, user.role);
    if (!target) return;
    navigate(target);
  },

  /** Invalidate the cached unread count after a relevant event. */
  refreshUnreadCount() {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
};

/* ── Internal navigation helper ────────────────────────────────────────── */

function navigate(target: DeepLinkTarget) {
  if (!target || !navigationRef.isReady()) return;
  // Bottom-tab + nested stack navigation:
  //   navigate(<tab>, { screen: <stackScreen>, params })
  navigationRef.navigate(
    target.tab as never,
    target.screen
      ? ({ screen: target.screen, params: target.params } as never)
      : (undefined as never),
  );
}

/* ── Convenience type re-exports for hook consumers ────────────────────── */
export type { Notification, NotificationType } from '@/constants/notificationTypes';
