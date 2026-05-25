import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SellerProfileScreen } from '@/screens/seller/SellerProfileScreen';
import { EditSellerProfileScreen } from '@/screens/seller/EditSellerProfileScreen';
import type { SellerProfileStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<SellerProfileStackParamList>();

export function SellerProfileStack() {
  return (
    <Stack.Navigator
      initialRouteName="SellerProfile"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SellerProfile"     component={SellerProfileScreen} />
      <Stack.Screen name="EditSellerProfile" component={EditSellerProfileScreen} />
    </Stack.Navigator>
  );
}
