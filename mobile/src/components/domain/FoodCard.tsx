import { memo } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { FoodImage } from '@/components/ui/Image';
import { Text } from '@/components/ui/Text';
import { PriceTag } from './PriceTag';
import { colors, radii, shadows, spacing } from '@/theme';
import type { MenuItem } from '@/types/domain.types';

interface Props {
  item: MenuItem;
  onPress: (item: MenuItem) => void;
  /** Horizontal card variant (Home featured row) vs vertical (grid/list). */
  layout?: 'vertical' | 'horizontal';
  style?: ViewStyle;
}

/**
 * Reusable food item card. Memoized — appears in FlatLists where parent
 * re-renders shouldn't propagate.
 */
function FoodCardImpl({ item, onPress, layout = 'vertical', style }: Props) {
  if (layout === 'horizontal') {
    return (
      <Pressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.price} dirhams`}
        style={({ pressed }) => [
          styles.hCard,
          shadows.sm,
          pressed && { opacity: 0.85 },
          style,
        ]}
      >
        <FoodImage uri={item.image_url} style={styles.hImage} />
        <View style={styles.hBody}>
          <Text variant="bodyBold" numberOfLines={1}>{item.name}</Text>
          {item.seller ? (
            <Text variant="caption" color="text.secondary" numberOfLines={1}>
              {item.seller.business_name}
            </Text>
          ) : null}
          <View style={styles.hFooter}>
            <PriceTag amount={item.price} size="sm" />
            {!item.is_available ? (
              <Text variant="caption" color="feedback.error">
                Unavailable
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.price} dirhams`}
      style={({ pressed }) => [
        styles.vCard,
        shadows.sm,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <FoodImage uri={item.image_url} style={styles.vImage} />
      <View style={styles.vBody}>
        <Text variant="bodyBold" numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text variant="bodySmall" color="text.secondary" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.vFooter}>
          <PriceTag amount={item.price} />
          {!item.is_available ? (
            <Text variant="caption" color="feedback.error">
              Unavailable
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const FoodCard = memo(FoodCardImpl);

const styles = StyleSheet.create({
  // Vertical (full-width list card / 2-up grid)
  vCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  vImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  vBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  vFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  // Horizontal (compact featured-row card)
  hCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  hImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  hBody: {
    padding: spacing.sm,
    gap: 2,
  },
  hFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
