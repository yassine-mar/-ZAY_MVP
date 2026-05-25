import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Category } from '@/types/domain.types';

interface Props {
  category: Category;
  onPress: (category: Category) => void;
  /** Compact (Home row) vs tile (Categories grid). */
  variant?: 'row' | 'tile';
}

export function CategoryChip({ category, onPress, variant = 'row' }: Props) {
  if (variant === 'tile') {
    return (
      <Pressable
        onPress={() => onPress(category)}
        accessibilityRole="button"
        accessibilityLabel={category.name}
        style={({ pressed }) => [
          styles.tile,
          shadows.sm,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.tileIconWrap}>
          <Text variant="h2" align="center">{category.icon ?? '🍽️'}</Text>
        </View>
        <Text variant="bodySmallMedium" align="center" numberOfLines={1}>
          {category.name}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text variant="h3" style={styles.rowIcon}>{category.icon ?? '🍽️'}</Text>
      <Text variant="bodySmallMedium" align="center" numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Row (horizontal scroller on Home)
  row: {
    width: 80,
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowIcon: {
    width: 56,
    height: 56,
    lineHeight: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    textAlign: 'center',
    overflow: 'hidden',
  },

  // Tile (Categories grid)
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
