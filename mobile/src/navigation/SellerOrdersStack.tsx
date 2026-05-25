import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IncomingOrdersScreen } from '@/screens/seller/IncomingOrdersScreen';
import { SellerOrderDetailScreen } from '@/screens/seller/SellerOrderDetailScreen';
import type { SellerOrdersStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<SellerOrdersStackParamList>();

export function SellerOrdersStack() {
  return (
    <Stack.Navigator
      initialRouteName="IncomingOrders"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="IncomingOrders"    component={IncomingOrdersScreen} />
      <Stack.Screen name="SellerOrderDetail" component={SellerOrderDetailScreen} />
    </Stack.Navigator>
  );
}
