import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersScreen } from '@/screens/customer/OrdersScreen';
import { OrderTrackingScreen } from '@/screens/customer/OrderTrackingScreen';
import type { OrdersStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator
      initialRouteName="Orders"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
}
