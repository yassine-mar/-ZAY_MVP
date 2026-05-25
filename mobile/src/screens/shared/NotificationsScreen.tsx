import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Bell, CheckCheck } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { NotificationRow } from '@/components/domain/NotificationRow';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { notificationsApi } from '@/api/notifications.api';
import { notificationsService } from '@/services/notifications.service';
import { useAuth } from '@/hooks/useAuth';
import { resolveDeepLink, type Notification } from '@/constants/notificationTypes';
import { parseApiError } from '@/utils/error';
import { colors, radii, spacing } from '@/theme';

/**
 * Shared notification inbox — same component for customer + seller + admin.
 * The deep-link target is computed per-row from the user's role.
 *
 * Presented as a modal (pushed by CustomerRoot / SellerRoot). Tapping a
 * row marks-read, closes the modal, and navigates to the relevant detail.
 */
export function NotificationsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ page: 1, limit: 30 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      // Optimistic — strike-through unread immediately so the inbox feels snappy.
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData<{ items: Notification[] }>(['notifications']);
      if (prev) {
        qc.setQueryData(['notifications'], {
          ...prev,
          items: prev.items.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
          ),
        });
      }
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev);
      Toast.show({ type: 'error', text1: parseApiError(err).message });
    },
    onSettled: () => {
      notificationsService.refreshUnreadCount();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      notificationsService.refreshUnreadCount();
      Toast.show({ type: 'success', text1: 'All caught up' });
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: parseApiError(err).message }),
  });

  const handleRowPress = useCallback(
    (n: Notification) => {
      if (!n.is_read) markReadMutation.mutate(n.id);
      const target = user ? resolveDeepLink(n, user.role) : null;
      // Close the modal first so the underlying tree receives the navigation.
      navigation.goBack();
      if (target) {
        // Defer one tick so goBack's animation starts before the deeper push.
        setTimeout(() => notificationsService.routeToNotification({
          type: n.type,
          order_id: n.order_id,
          data: n.data,
        }), 50);
      }
    },
    [user, markReadMutation, navigation],
  );

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  const headerRight = hasUnread ? (
    <Text
      variant="bodySmallMedium"
      color="primary"
      onPress={() => markAllReadMutation.mutate()}
      accessibilityRole="button"
      accessibilityLabel="Mark all as read"
    >
      <View style={styles.markAllRow}>
        <CheckCheck size={14} color={colors.primary} />
        <Text variant="bodySmallMedium" color="primary"> Mark all</Text>
      </View>
    </Text>
  ) : null;

  if (isError) {
    return (
      <SafeScreen>
        <ScreenHeader
          title="Notifications"
          onBack={() => navigation.goBack()}
        />
        <ErrorScreen onRetry={() => refetch()} />
      </SafeScreen>
    );
  }

  if (isLoading) {
    return (
      <SafeScreen>
        <ScreenHeader
          title="Notifications"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={80} borderRadius={radii.lg} />
          ))}
        </View>
      </SafeScreen>
    );
  }

  if (items.length === 0) {
    return (
      <SafeScreen>
        <ScreenHeader
          title="Notifications"
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Order updates and account events will appear here as they happen."
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightAction={headerRight}
      />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={handleRowPress} />
        )}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.lg,
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
