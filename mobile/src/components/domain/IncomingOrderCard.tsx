import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';
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

/**
 * Seller-side order card. Different from the customer's `OrderCard`:
 *   - leads with the *order age* (sellers care about SLA more than seller name)
 *   - highlights pending orders with a left accent stripe
 *   - shows item count + total prominently
 */
function IncomingOrderCardImpl({ order, onPress }: Props) {
  const isPending = order.status === 'pending';
  const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Pressable
      onPress={() => onPress(order)}
      accessibilityRole="button"
      accessibilityLabel={`Order from ${order.customer?.name ?? 'customer'}, ${order.status}`}
      style={({ pressed }) => [
        styles.root,
        shadows.sm,
        isPending && styles.rootPending,
        pressed && { opacity: 0.85 },
      ]}
    >
      {isPending ? <View style={styles.accentStripe} /> : null}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold" numberOfLines={1}>
              {order.customer?.name ?? 'Customer'}
            </Text>
            <View style={styles.ageRow}>
              <Clock size={12} color={isPending ? colors.feedback.warning : colors.text.tertiary} />
              <Text
                variant="caption"
                color={isPending ? 'feedback.warning' : 'text.tertiary'}
              >
                {formatRelative(order.created_at)}
              </Text>
            </View>
          </View>
          <OrderStatusBadge status={order.status} />
        </View>

        <View style={styles.itemsRow}>
          <Text variant="bodySmall" color="text.secondary" numberOfLines={2}>
            {order.items.length === 1
              ? `${order.items[0]!.quantity} × ${order.items[0]!.name}`
              : `${itemsCount} items · ${order.items[0]!.name}${order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}`}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text variant="caption" color="text.tertiary">
            {order.delivery_address.city}
            {order.delivery_address.district ? ` · ${order.delivery_address.district}` : ''}
          </Text>
          <PriceTag amount={order.total_amount} size="sm" />
        </View>

        {isPending ? (
          <View style={styles.actionHint}>
            <AlertCircle size={12} color={colors.feedback.warning} />
            <Text variant="caption" color="feedback.warning">
              Tap to accept or decline
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export const IncomingOrderCard = memo(IncomingOrderCardImpl);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rootPending: {
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  accentStripe: {
    width: 4,
    backgroundColor: colors.feedback.warning,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemsRow: {
    flexDirection: 'row',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
