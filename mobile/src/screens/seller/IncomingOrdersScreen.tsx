import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IncomingOrderCard } from '@/components/domain/IncomingOrderCard';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { sellerOrdersApi } from '@/api/sellerOrders.api';
import { ACTIVE_STATUSES, TERMINAL_STATUSES } from '@/constants/orderStatus';
import { colors, radii, spacing } from '@/theme';
import type { OrderStatus } from '@/types/domain.types';
import type { SellerOrdersScreenProps } from '@/types/navigation.types';

type Filter = 'pending' | 'active' | 'past' | 'all';

const FILTER_TO_STATUSES: Record<Filter, OrderStatus[] | undefined> = {
  pending: ['pending'],
  active: ACTIVE_STATUSES,
  past: TERMINAL_STATUSES,
  all: undefined,
};

const FILTER_LABEL: Record<Filter, string> = {
  pending: 'Pending',
  active: 'Active',
  past: 'Past',
  all: 'All',
};

export function IncomingOrdersScreen({
  navigation,
}: SellerOrdersScreenProps<'IncomingOrders'>) {
  // Default to pending — that's what sellers open this screen for.
  const [filter, setFilter] = useState<Filter>('pending');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['seller', 'orders', { filter }],
    queryFn: () =>
      sellerOrdersApi.list({
        status: FILTER_TO_STATUSES[filter],
        page: 1,
        limit: 30,
      }),
    refetchInterval: filter === 'pending' ? 60_000 : false,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <SafeScreen>
      <ScreenHeader title="Orders" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(['pending', 'active', 'past', 'all'] as const).map((f) => (
          <Chip
            key={f}
            label={FILTER_LABEL[f]}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      {isError ? (
        <ErrorScreen onRetry={onRefresh} />
      ) : isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} borderRadius={radii.lg} />
          ))}
        </View>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            filter === 'pending'
              ? 'No pending orders'
              : filter === 'active'
              ? 'No active orders'
              : filter === 'past'
              ? 'No past orders'
              : 'No orders yet'
          }
          description={
            filter === 'pending'
              ? "You're all caught up. New orders will appear here when customers place them."
              : 'Try a different filter, or pull down to refresh.'
          }
        />
      ) : (
        <FlatList
          data={data!.items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <IncomingOrderCard
              order={item}
              onPress={() =>
                navigation.navigate('SellerOrderDetail', { orderId: item.id })
              }
            />
          )}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  skeletonList: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.lg,
  },
});
