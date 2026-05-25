import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  ShoppingBag,
  Wallet,
  Clock,
  TrendingUp,
  ArrowRight,
  Inbox,
  Bell,
} from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { StatCard } from '@/components/domain/StatCard';
import { AvailabilityToggle } from '@/components/domain/AvailabilityToggle';
import { IncomingOrderCard } from '@/components/domain/IncomingOrderCard';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { useAuth } from '@/hooks/useAuth';
import { sellerApi } from '@/api/seller.api';
import { sellerOrdersApi } from '@/api/sellerOrders.api';
import { formatPrice } from '@/utils/format';
import { parseApiError } from '@/utils/error';
import { useAuthStore } from '@/store/auth.store';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { colors, radii, spacing } from '@/theme';
import type { SellerTabsScreenProps } from '@/types/navigation.types';

export function DashboardScreen({ navigation }: SellerTabsScreenProps<'DashboardTab'>) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { count: unreadCount } = useUnreadNotifications();
  const profile = user?.seller_profile ?? null;
  const firstName = user?.name.split(' ')[0] ?? '';

  const analyticsQ = useQuery({
    queryKey: ['seller', 'analytics'],
    queryFn: () => sellerApi.analytics(),
    staleTime: 30_000,
  });

  const pendingQ = useQuery({
    queryKey: ['seller', 'orders', { status: 'pending', preview: true }],
    queryFn: () => sellerOrdersApi.list({ status: 'pending', page: 1, limit: 3 }),
  });

  // Optimistic toggle — flip the local user immediately, revert on failure.
  const toggleMutation = useMutation({
    mutationFn: (isOpen: boolean) => sellerApi.setAvailability(isOpen),
    onMutate: (isOpen) => {
      const prev = useAuthStore.getState().user;
      if (prev?.seller_profile) {
        useAuthStore.getState().setUser({
          ...prev,
          seller_profile: { ...prev.seller_profile, is_open: isOpen },
        });
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) useAuthStore.getState().setUser(ctx.prev);
      const parsed = parseApiError(err);
      Toast.show({ type: 'error', text1: parsed.message });
    },
    onSuccess: ({ profile: updated }) => {
      const cur = useAuthStore.getState().user;
      if (cur) {
        useAuthStore.getState().setUser({ ...cur, seller_profile: updated });
      }
      qc.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });

  const onRefresh = useCallback(() => {
    analyticsQ.refetch();
    pendingQ.refetch();
  }, [analyticsQ, pendingQ]);

  const a = analyticsQ.data?.analytics;
  const pendingOrders = pendingQ.data?.items ?? [];

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="text.secondary">Welcome back,</Text>
          <Text variant="h3" numberOfLines={1}>
            {profile?.business_name ?? firstName}
          </Text>
        </View>
        <IconButton
          onPress={() =>
            navigation
              .getParent()
              // @ts-expect-error — SellerRoot.Notifications is one level above this tab
              ?.navigate('Notifications')
          }
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
          variant="tinted"
          badge={unreadCount}
        >
          <Bell size={20} color={colors.text.primary} strokeWidth={1.8} />
        </IconButton>
        <AvailabilityToggle
          isOpen={profile?.is_open ?? false}
          onToggle={(next) => toggleMutation.mutate(next)}
          disabled={toggleMutation.isPending}
        />
      </View>

      {analyticsQ.isError && pendingQ.isError ? (
        <ErrorScreen onRetry={onRefresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={analyticsQ.isRefetching || pendingQ.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Today */}
          <Text variant="overline" color="text.secondary" style={styles.sectionLabel}>
            Today
          </Text>
          <View style={styles.statsGrid}>
            {analyticsQ.isLoading || !a ? (
              <>
                <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
                <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
                <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
                <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
              </>
            ) : (
              <>
                <StatCard
                  label="Orders"
                  value={a.today.orders.toLocaleString()}
                  icon={ShoppingBag}
                />
                <StatCard
                  label="Revenue"
                  value={formatPrice(a.today.revenue)}
                  icon={Wallet}
                />
                <StatCard
                  label="Pending"
                  value={a.today.pending.toLocaleString()}
                  icon={Clock}
                  accent={a.today.pending > 0 ? 'warning' : 'primary'}
                  caption={a.today.pending > 0 ? 'Action needed' : 'All caught up'}
                />
                <StatCard
                  label="Cancelled"
                  value={a.today.cancelled.toLocaleString()}
                  icon={TrendingUp}
                  accent={a.today.cancelled > 0 ? 'error' : 'primary'}
                />
              </>
            )}
          </View>

          {/* Pending preview */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="overline" color="text.secondary">Needs your attention</Text>
              {(pendingQ.data?.pagination?.total ?? 0) > 0 ? (
                <Pressable
                  onPress={() => navigation.navigate('SellerOrdersTab')}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <View style={styles.viewAll}>
                    <Text variant="bodySmallMedium" color="primary">View all</Text>
                    <ArrowRight size={14} color={colors.primary} />
                  </View>
                </Pressable>
              ) : null}
            </View>

            {pendingQ.isLoading ? (
              <View style={{ gap: spacing.sm }}>
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} height={120} borderRadius={radii.lg} />
                ))}
              </View>
            ) : pendingOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <EmptyState
                  icon={Inbox}
                  title="No pending orders"
                  description="When customers place orders, they'll appear here for you to accept."
                />
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {pendingOrders.map((o) => (
                  <IncomingOrderCard
                    key={o.id}
                    order={o}
                    onPress={() =>
                      navigation.navigate('SellerOrdersTab', {
                        screen: 'SellerOrderDetail',
                        params: { orderId: o.id },
                      } as never)
                    }
                  />
                ))}
              </View>
            )}
          </View>

          {/* Period stats */}
          <View style={styles.section}>
            <Text variant="overline" color="text.secondary" style={styles.sectionLabel}>
              Last 7 days
            </Text>
            <View style={styles.statsGrid}>
              {analyticsQ.isLoading || !a ? (
                <>
                  <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
                  <Skeleton height={92} borderRadius={radii.lg} style={{ flex: 1, minWidth: 140 }} />
                </>
              ) : (
                <>
                  <StatCard
                    label="Orders"
                    value={a.this_week.orders.toLocaleString()}
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Revenue"
                    value={formatPrice(a.this_week.revenue)}
                    icon={Wallet}
                  />
                </>
              )}
            </View>
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
});
