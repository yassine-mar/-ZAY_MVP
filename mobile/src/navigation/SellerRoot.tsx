import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SellerTabs } from './SellerTabs';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { useSellerOrderEvents } from '@/hooks/useSellerOrderEvents';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { SellerRootParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<SellerRootParamList>();

/**
 * Approved-seller root.
 *
 * Mounts the global socket listener for new-order events here (not inside
 * a specific screen) so a seller browsing the Menu tab still sees a toast
 * the moment a customer places an order.
 *
 * usePushNotifications() handles the silent FCM-token registration for
 * sellers who already granted permission.
 */
export function SellerRoot() {
  useSellerOrderEvents();
  usePushNotifications();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={SellerTabs} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
