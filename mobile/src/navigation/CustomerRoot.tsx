import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerTabs } from './CustomerTabs';
import { CartScreen } from '@/screens/customer/CartScreen';
import { CheckoutScreen } from '@/screens/customer/CheckoutScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { CustomerRootParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<CustomerRootParamList>();

/**
 * Root of the authenticated customer flow.
 *
 * Tabs are the home; Cart, Checkout, and Notifications are modals over
 * the tab bar (iOS-style slide-up). Notifications-as-modal lets any tab
 * launch the inbox without duplicating the screen across stacks.
 *
 * usePushNotifications() mounts here so the FCM token registers as soon
 * as a customer enters the authenticated tree.
 */
export function CustomerRoot() {
  usePushNotifications();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={CustomerTabs} />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
