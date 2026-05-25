import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Receipt, User } from 'lucide-react-native';
import { HomeStack } from './HomeStack';
import { OrdersStack } from './OrdersStack';
import { ProfileStack } from './ProfileStack';
import { colors } from '@/theme';
import type { CustomerTabsParamList } from '@/types/navigation.types';

const Tab = createBottomTabNavigator<CustomerTabsParamList>();

export function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size ?? 22} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size ?? 22} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 22} strokeWidth={1.8} />,
        }}
      />
    </Tab.Navigator>
  );
}
