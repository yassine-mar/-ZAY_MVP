import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MenuListScreen } from '@/screens/seller/MenuListScreen';
import { AddEditMenuScreen } from '@/screens/seller/AddEditMenuScreen';
import { AddEditItemScreen } from '@/screens/seller/AddEditItemScreen';
import type { SellerMenuStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<SellerMenuStackParamList>();

export function SellerMenuStack() {
  return (
    <Stack.Navigator
      initialRouteName="MenuList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MenuList"     component={MenuListScreen} />
      <Stack.Screen
        name="AddEditMenu"
        component={AddEditMenuScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItemScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
