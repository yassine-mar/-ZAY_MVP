import { Pressable, View, StyleSheet, Switch } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { FoodImage } from '@/components/ui/Image';
import { Text } from '@/components/ui/Text';
import { PriceTag } from './PriceTag';
import { colors, radii, spacing } from '@/theme';
import type { MenuItem } from '@/types/domain.types';

interface Props {
  item: MenuItem;
  onPress: () => void;
  onToggleAvailability: (next: boolean) => void;
}

/**
 * Seller-side menu item row.
 *   - tap → edit
 *   - inline availability Switch lets sellers toggle without opening the form
 */
export function MenuItemRow({ item, onPress, onToggleAvailability }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item.name}`}
      style={({ pressed }) => [
        styles.root,
        !item.is_available && { opacity: 0.7 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <FoodImage uri={item.image_url} style={styles.image} />
      <View style={styles.body}>
        <Text variant="bodyBold" numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text variant="caption" color="text.secondary" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.footerRow}>
          <PriceTag amount={item.price} size="sm" />
          <View style={styles.switchRow}>
            <Text variant="caption" color="text.tertiary">
              {item.is_available ? 'Available' : 'Hidden'}
            </Text>
            <Switch
              value={item.is_available}
              onValueChange={onToggleAvailability}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
            />
          </View>
        </View>
      </View>
      <View style={styles.editIndicator}>
        <Pencil size={14} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editIndicator: {
    paddingHorizontal: spacing.xs,
  },
});
