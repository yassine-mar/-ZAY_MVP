import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderCard } from '@/components/domain/OrderCard';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { ordersApi } from '@/api/orders.api';
import { ACTIVE_STATUSES, TERMINAL_STATUSES } from '@/constants/orderStatus';
import { colors, radii, spacing } from '@/theme';
import type { OrderStatus } from '@/types/domain.types';
import type { OrdersStackScreenProps } from '@/types/navigation.types';

type Filter = 'all' | 'active' | 'past';

const FILTER_TO_STATUSES: Record<Filter, OrderStatus[] | undefined> = {
  all: undefined,
  active: ACTIVE_STATUSES,
  past: TERMINAL_STATUSES,
};

export function OrdersScreen({ navigation }: OrdersStackScreenProps<'Orders'>) {
  const [filter, setFilter] = useState<Filter>('all');
  const statuses = FILTER_TO_STATUSES[filter];

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['orders', { filter }],
    queryFn: () => ordersApi.list({ status: statuses, page: 1, limit: 30 }),
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <SafeScreen>
      <ScreenHeader title="Your orders" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip label="All"    selected={filter === 'all'}    onPress={() => setFilter('all')} />
        <Chip label="Active" selected={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label="Past"   selected={filter === 'past'}   onPress={() => setFilter('past')} />
      </ScrollView>

      {isError ? (
        <ErrorScreen onRetry={onRefresh} />
      ) : isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={108} borderRadius={radii.lg} />
          ))}
        </View>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            filter === 'active'
              ? 'No active orders'
              : filter === 'past'
              ? 'No past orders yet'
              : 'No orders yet'
          }
          description="When you place an order, it'll show up here so you can track it in real time."
          actionLabel={filter === 'all' ? 'Browse kitchens' : undefined}
          onAction={
            filter === 'all'
              ? () => navigation.navigate('HomeTab')
              : undefined
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
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
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
