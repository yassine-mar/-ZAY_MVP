import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PriceTag } from './PriceTag';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatRelative } from '@/utils/format';
import type { Order } from '@/types/domain.types';

interface Props {
  order: Order;
  onPress: (order: Order) => void;
}

function OrderCardImpl({ order, onPress }: Props) {
  const summary =
    order.items.length === 1
      ? order.items[0]!.name
      : `${order.items[0]!.name} + ${order.items.length - 1} more`;

  return (
    <Pressable
      onPress={() => onPress(order)}
      accessibilityRole="button"
      accessibilityLabel={`Order from ${order.seller.business_name}, ${order.status}`}
      style={({ pressed }) => [
        styles.root,
        shadows.sm,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.row}>
        <Avatar
          uri={order.seller.avatar_url}
          name={order.seller.business_name}
          size={44}
        />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text variant="bodyBold" numberOfLines={1} style={styles.title}>
              {order.seller.business_name}
            </Text>
            <OrderStatusBadge status={order.status} />
          </View>
          <Text variant="bodySmall" color="text.secondary" numberOfLines={1}>
            {summary}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text variant="caption" color="text.tertiary">
          {formatRelative(order.created_at)}
        </Text>
        <PriceTag amount={order.total_amount} size="sm" />
      </View>
    </Pressable>
  );
}

export const OrderCard = memo(OrderCardImpl);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  body: { flex: 1, gap: 2 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
});
