import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { type ReactNode } from 'react';
import { Text } from './Text';
import { colors, radii } from '@/theme';

interface IconButtonProps {
  onPress: () => void;
  children: ReactNode;
  size?: number;
  /** Optional badge number (e.g. cart count). */
  badge?: number;
  accessibilityLabel: string;
  variant?: 'plain' | 'tinted';
  style?: ViewStyle;
}

export function IconButton({
  onPress,
  children,
  size = 40,
  badge,
  accessibilityLabel,
  variant = 'plain',
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: variant === 'tinted' ? colors.surfaceMuted : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {children}
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text
            variant="caption"
            color="text.onPrimary"
            style={styles.badgeText}
            numberOfLines={1}
          >
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
