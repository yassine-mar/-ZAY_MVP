import { View, StyleSheet, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { FoodImage } from '@/components/ui/Image';
import { Text } from '@/components/ui/Text';
import { QuantityStepper } from './QuantityStepper';
import { PriceTag } from './PriceTag';
import { colors, radii, spacing } from '@/theme';
import type { CartLine } from '@/types/domain.types';

interface Props {
  line: CartLine;
  onChangeQuantity: (next: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ line, onChangeQuantity, onRemove }: Props) {
  return (
    <View style={styles.root}>
      <FoodImage uri={line.image_url} style={styles.image} />
      <View style={styles.body}>
        <Text variant="bodyBold" numberOfLines={1}>{line.name}</Text>
        <PriceTag amount={line.price} size="sm" />
        <View style={styles.footer}>
          <QuantityStepper
            value={line.quantity}
            onChange={onChangeQuantity}
            size="sm"
          />
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove item"
            style={({ pressed }) => pressed && { opacity: 0.5 }}
          >
            <Trash2 size={18} color={colors.feedback.error} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.lg,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
