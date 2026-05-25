import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerTabs } from './CustomerTabs';
import { CartScreen } from '@/screens/customer/CartScreen';
import { CheckoutScreen } from '@/screens/customer/CheckoutScreen';
import type { CustomerRootParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<CustomerRootParamList>();

/**
 * Root of the authenticated customer flow.
 *
 * Tabs are the home; Cart and Checkout are presented as modals over the
 * tab bar (iOS-style slide-up). This lets any tab launch the cart without
 * each tab needing its own copy of the screen.
 */
export function CustomerRoot() {
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
    </Stack.Navigator>
  );
}
