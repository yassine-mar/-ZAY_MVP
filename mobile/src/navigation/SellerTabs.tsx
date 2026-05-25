import { useQuery } from '@tanstack/react-query';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Inbox, BookOpen, Store } from 'lucide-react-native';

import { SellerOrdersStack } from './SellerOrdersStack';
import { SellerMenuStack } from './SellerMenuStack';
import { SellerProfileStack } from './SellerProfileStack';
import { DashboardScreen } from '@/screens/seller/DashboardScreen';
import { sellerOrdersApi } from '@/api/sellerOrders.api';
import { colors } from '@/theme';
import type { SellerTabsParamList } from '@/types/navigation.types';

const Tab = createBottomTabNavigator<SellerTabsParamList>();

export function SellerTabs() {
  // Background pending-order count drives the Orders tab badge.
  // Polls every minute as the FCM fallback (Critique #3).
  const { data } = useQuery({
    queryKey: ['seller', 'orders', 'pending-count'],
    queryFn: () => sellerOrdersApi.list({ status: 'pending', page: 1, limit: 1 }),
    refetchInterval: 60_000,
  });
  const pendingCount = data?.pagination?.total ?? 0;

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
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size ?? 22} strokeWidth={1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="SellerOrdersTab"
        component={SellerOrdersStack}
        options={{
          title: 'Orders',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.text.onPrimary },
          tabBarIcon: ({ color, size }) => (
            <Inbox color={color} size={size ?? 22} strokeWidth={1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="SellerMenuTab"
        component={SellerMenuStack}
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <BookOpen color={color} size={size ?? 22} strokeWidth={1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="SellerProfileTab"
        component={SellerProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Store color={color} size={size ?? 22} strokeWidth={1.8} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
