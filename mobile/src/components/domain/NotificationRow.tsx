import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import {
  Bell,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  ShoppingBag,
  UserCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import { formatRelative } from '@/utils/format';
import type {
  Notification,
  NotificationType,
} from '@/constants/notificationTypes';

interface Props {
  notification: Notification;
  onPress: (n: Notification) => void;
}

const ICON_FOR: Record<NotificationType, LucideIcon> = {
  order_placed:           ShoppingBag,
  order_accepted:         CheckCircle2,
  order_preparing:        ChefHat,
  order_ready:            PackageCheck,
  order_delivered:        Truck,
  order_cancelled:        XCircle,
  order_auto_cancelled:   XCircle,
  seller_approved:        UserCheck,
  seller_rejected:        XCircle,
  seller_suspended:       ShieldAlert,
  admin_seller_registered: UserCheck,
  admin_order_escalation: ShieldAlert,
  system:                 Bell,
};

const TINT_FOR: Record<NotificationType, string> = {
  order_placed:           colors.primary,
  order_accepted:         colors.status.accepted,
  order_preparing:        colors.status.preparing,
  order_ready:            colors.status.ready,
  order_delivered:        colors.status.delivered,
  order_cancelled:        colors.status.cancelled,
  order_auto_cancelled:   colors.status.cancelled,
  seller_approved:        colors.feedback.success,
  seller_rejected:        colors.feedback.error,
  seller_suspended:       colors.feedback.error,
  admin_seller_registered: colors.primary,
  admin_order_escalation: colors.feedback.warning,
  system:                 colors.text.secondary,
};

function NotificationRowImpl({ notification, onPress }: Props) {
  const Icon = ICON_FOR[notification.type] ?? Bell;
  const tint = TINT_FOR[notification.type] ?? colors.text.secondary;
  const isUnread = !notification.is_read;

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      accessibilityHint={notification.body}
      style={({ pressed }) => [
        styles.root,
        isUnread && styles.rootUnread,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + '20' }]}>
        <Icon size={20} color={tint} strokeWidth={1.8} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text
            variant={isUnread ? 'bodyBold' : 'bodyMedium'}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {notification.title}
          </Text>
          <Text variant="caption" color="text.tertiary">
            {formatRelative(notification.created_at)}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          color={isUnread ? 'text.primary' : 'text.secondary'}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

export const NotificationRow = memo(NotificationRowImpl);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'flex-start',
  },
  rootUnread: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
});
