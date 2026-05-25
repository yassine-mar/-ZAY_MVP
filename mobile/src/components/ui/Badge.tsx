import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { radii, spacing } from '@/theme';

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  style?: ViewStyle;
}

export function Badge({ label, color, bg, style }: BadgeProps) {
  return (
    <View style={[styles.root, { backgroundColor: bg }, style]}>
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
});
