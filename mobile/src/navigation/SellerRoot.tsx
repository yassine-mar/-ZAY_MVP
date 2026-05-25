import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SellerTabs } from './SellerTabs';
import { useSellerOrderEvents } from '@/hooks/useSellerOrderEvents';
import type { SellerRootParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<SellerRootParamList>();

/**
 * Approved-seller root.
 *
 * Mounts the global socket listener for new-order events here (not inside
 * a specific screen) so a seller browsing the Menu tab still sees a toast
 * the moment a customer places an order.
 */
export function SellerRoot() {
  useSellerOrderEvents();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={SellerTabs} />
    </Stack.Navigator>
  );
}
