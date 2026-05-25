import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors, radii, spacing } from '@/theme';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Anything rendered above the action — e.g. a secondary button. */
  extra?: ReactNode;
}

/**
 * Standardized empty state. Used by every list/detail screen so the
 * "nothing here" experience is consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  extra,
}: EmptyStateProps) {
  return (
    <View style={styles.root}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={28} color={colors.primary} strokeWidth={1.8} />
        </View>
      ) : null}
      <Text variant="h3" align="center">{title}</Text>
      {description ? (
        <Text
          variant="bodySmall"
          color="text.secondary"
          align="center"
          style={styles.description}
        >
          {description}
        </Text>
      ) : null}
      {extra}
      {actionLabel && onAction ? (
        <Button onPress={onAction} variant="primary" style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    maxWidth: 320,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});
