import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/customer/HomeScreen';
import { CategoriesScreen } from '@/screens/customer/CategoriesScreen';
import { SearchScreen } from '@/screens/customer/SearchScreen';
import { SellerProfileScreen } from '@/screens/customer/SellerProfileScreen';
import { FoodDetailsScreen } from '@/screens/customer/FoodDetailsScreen';
import type { HomeStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home"          component={HomeScreen} />
      <Stack.Screen name="Categories"    component={CategoriesScreen} />
      <Stack.Screen name="Search"        component={SearchScreen} />
      <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
      <Stack.Screen name="FoodDetails"   component={FoodDetailsScreen} />
    </Stack.Navigator>
  );
}
