import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  User as UserIcon,
  Bell,
  HelpCircle,
  LogOut,
  Circle,
  MapPin,
  Truck,
  type LucideIcon,
} from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/SkeletonLoader';

import { sellerApi } from '@/api/seller.api';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { formatPrice } from '@/utils/format';
import { colors, radii, shadows, spacing } from '@/theme';
import type { SellerProfileScreenProps } from '@/types/navigation.types';

interface MenuRow {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
}

export function SellerProfileScreen({
  navigation,
}: SellerProfileScreenProps<'SellerProfile'>) {
  const { user } = useAuth();
  const profile = user?.seller_profile ?? null;

  const analyticsQ = useQuery({
    queryKey: ['seller', 'analytics'],
    queryFn: () => sellerApi.analytics(),
    staleTime: 60_000,
  });

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      "You'll stop receiving new-order notifications until you sign in again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => { void authService.logout(); },
        },
      ],
    );
  };

  const menuRows: MenuRow[] = [
    {
      icon: UserIcon,
      label: 'Edit profile',
      description: 'Business name, description, delivery radius',
      onPress: () => navigation.navigate('EditSellerProfile'),
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Push & sound preferences',
      onPress: () => Alert.alert('Coming soon', 'Notification preferences in v1.1.'),
    },
    {
      icon: HelpCircle,
      label: 'Help & support',
      description: 'FAQ and contact',
      onPress: () => Alert.alert('Support', 'Email us at support@zay.ma'),
    },
  ];

  return (
    <SafeScreen edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <Avatar uri={user?.avatar_url} name={profile?.business_name ?? user?.name} size={72} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3" numberOfLines={1}>
              {profile?.business_name ?? user?.name ?? 'Your kitchen'}
            </Text>
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.text.secondary} />
              <Text variant="caption" color="text.secondary">
                {profile?.city ?? '—'}
              </Text>
              <Text variant="caption" color="text.tertiary"> · </Text>
              <Truck size={12} color={colors.text.secondary} />
              <Text variant="caption" color="text.secondary">
                {profile?.delivery_radius_km ?? '—'} km radius
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Circle
                size={6}
                color={profile?.is_open ? colors.feedback.success : colors.text.tertiary}
                fill={profile?.is_open ? colors.feedback.success : colors.text.tertiary}
              />
              <Text
                variant="caption"
                color={profile?.is_open ? 'feedback.success' : 'text.tertiary'}
              >
                {profile?.is_open ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="caption" color="text.secondary">Today</Text>
            {analyticsQ.isLoading ? (
              <Skeleton width={60} height={18} style={{ marginTop: 4 }} />
            ) : (
              <Text variant="h3">
                {analyticsQ.data?.analytics.today.orders ?? 0}
              </Text>
            )}
            <Text variant="caption" color="text.tertiary">orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="caption" color="text.secondary">This month</Text>
            {analyticsQ.isLoading ? (
              <Skeleton width={80} height={18} style={{ marginTop: 4 }} />
            ) : (
              <Text variant="h3" numberOfLines={1}>
                {formatPrice(analyticsQ.data?.analytics.this_month.revenue ?? 0)}
              </Text>
            )}
            <Text variant="caption" color="text.tertiary">revenue</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuGroup}>
          {menuRows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={({ pressed }) => [
                styles.menuRow,
                i !== menuRows.length - 1 && styles.menuRowBorder,
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <View style={styles.rowIcon}>
                <row.icon size={18} color={colors.text.primary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{row.label}</Text>
                {row.description ? (
                  <Text variant="caption" color="text.secondary">
                    {row.description}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.logoutRow,
            pressed && { backgroundColor: colors.surfaceMuted },
          ]}
        >
          <LogOut size={18} color={colors.feedback.error} strokeWidth={1.8} />
          <Text variant="bodyMedium" color="feedback.error">
            Log out
          </Text>
        </Pressable>

        <Text
          variant="caption"
          color="text.tertiary"
          align="center"
          style={styles.versionLabel}
        >
          @ZAY · v1.0.0
        </Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  versionLabel: {
    marginTop: spacing.md,
  },
});
