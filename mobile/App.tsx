import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

import { RootNavigator } from '@/navigation/RootNavigator';
import { navigationRef, deepLinkQueue } from '@/navigation/navigationRef';
import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/notifications.service';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

// Keep the native splash up until JS is ready to render the brand frame.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  const [authHydrated, setAuthHydrated] = useState(false);

  // Validate persisted token and populate the auth store.
  useEffect(() => {
    authService.hydrate().finally(() => setAuthHydrated(true));
  }, []);

  /* ── Notification handlers (foreground + tap + cold-start) ─────────────── */
  const responseSubRef = useRef<Notifications.Subscription | null>(null);
  const receivedSubRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!authHydrated) return;

    // 1. Cold start — user opened the app by tapping a notification while
    //    it was killed. Route once the navigator is ready.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const payload = extractPayload(response);
      notificationsService.routeToNotification(payload);
    });

    // 2. Warm tap — user tapped a notification with app backgrounded.
    responseSubRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const payload = extractPayload(response);
        notificationsService.routeToNotification(payload);
      },
    );

    // 3. Foreground arrival — invalidate the inbox/badge so the bell
    //    badge updates. (The OS still shows the banner — see service.)
    receivedSubRef.current = Notifications.addNotificationReceivedListener(() => {
      notificationsService.refreshUnreadCount();
    });

    return () => {
      responseSubRef.current?.remove();
      receivedSubRef.current?.remove();
    };
  }, [authHydrated]);

  // Hide the native splash once everything that needs to be ready, is ready.
  // Both fonts AND auth hydration must complete before we render — otherwise
  // the first frame would use system fonts and flicker.
  useEffect(() => {
    if ((fontsLoaded || fontError) && authHydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError, authHydrated]);

  if ((!fontsLoaded && !fontError) || !authHydrated) {
    // Returning null keeps the native splash visible — no extra frame.
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.root}>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => deepLinkQueue.flushIfReady()}
          >
            <RootNavigator />
          </NavigationContainer>
          <Toast position="top" topOffset={56} />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function extractPayload(response: Notifications.NotificationResponse) {
  const raw = response.notification.request.content.data ?? {};
  return {
    type: typeof raw.type === 'string' ? raw.type : undefined,
    order_id: typeof raw.order_id === 'string' && raw.order_id !== ''
      ? (raw.order_id as string)
      : null,
    data: raw as Record<string, unknown>,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
