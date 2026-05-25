import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PendingApprovalScreen } from '@/screens/seller/PendingApprovalScreen';
import type { PendingSellerStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<PendingSellerStackParamList>();

export function PendingSellerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
}
