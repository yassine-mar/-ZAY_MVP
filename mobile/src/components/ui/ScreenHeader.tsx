import { type ReactNode } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from './Text';
import { colors, spacing } from '@/theme';

interface Props {
  title?: string;
  /** Show the back chevron. Required `onBack` when true. */
  onBack?: () => void;
  /** Trailing slot — usually a cart IconButton or filter pill. */
  rightAction?: ReactNode;
  /** Subtitle shown under the title in caption type. */
  subtitle?: string;
}

/**
 * Standard screen header — back chevron (optional) + title + right action.
 * Used on every customer screen that isn't a tab root.
 */
export function ScreenHeader({ title, onBack, rightAction, subtitle }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.leftSlot}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={26} color={colors.text.primary} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.titleBlock}>
        {title ? (
          <Text variant="bodyBold" numberOfLines={1} align="center">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="text.secondary" numberOfLines={1} align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  leftSlot: {
    width: 44,
    alignItems: 'flex-start',
  },
  rightSlot: {
    width: 44,
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
});
