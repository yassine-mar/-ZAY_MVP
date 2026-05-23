import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation.types';

/**
 * Ref to the NavigationContainer — lets services (push notification
 * handler, socket events, deep links) navigate without being React
 * components.
 *
 * Pending-link queue: deep links that arrive before the navigator is
 * mounted (cold start) are stored here and flushed once `isReady`.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingLink: { name: string; params?: object } | null = null;

export const deepLinkQueue = {
  enqueue(name: string, params?: object) {
    pendingLink = { name, params };
  },
  flushIfReady() {
    if (pendingLink && navigationRef.isReady()) {
      // @ts-expect-error — runtime name dispatch
      navigationRef.navigate(pendingLink.name, pendingLink.params);
      pendingLink = null;
    }
  },
};
