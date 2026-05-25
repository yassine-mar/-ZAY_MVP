import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingCart, ArrowRight } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CartItemRow } from '@/components/domain/CartItemRow';
import { CartSummary } from '@/components/domain/CartSummary';

import { useCart } from '@/hooks/useCart';
import { colors, radii, spacing } from '@/theme';
import type { CustomerRootScreenProps } from '@/types/navigation.types';

export function CartScreen({ navigation }: CustomerRootScreenProps<'Cart'>) {
  const insets = useSafeAreaInsets();
  const { items, sellerName, subtotal, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <SafeScreen>
        <ScreenHeader title="Your cart" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse kitchens and pick something delicious — your cart will appear here."
          actionLabel="Browse kitchens"
          onAction={() => {
            navigation.goBack();
          }}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScreenHeader
        title="Your cart"
        onBack={() => navigation.goBack()}
        rightAction={
          <X
            size={24}
            color={colors.text.primary}
            onPress={() => navigation.goBack()}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sellerName ? (
          <View style={styles.sellerBanner}>
            <Avatar uri={null} name={sellerName} size={32} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="text.secondary">From</Text>
              <Text variant="bodyBold" numberOfLines={1}>{sellerName}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.list}>
          {items.map((line) => (
            <CartItemRow
              key={line.menu_item_id}
              line={line}
              onChangeQuantity={(q) => updateQuantity(line.menu_item_id, q)}
              onRemove={() => removeItem(line.menu_item_id)}
            />
          ))}
        </View>

        <CartSummary subtotal={subtotal} />

        <Text variant="caption" color="text.tertiary" align="center" style={styles.footnote}>
          Final pricing confirmed at checkout. Delivery is arranged with the kitchen.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Button
          onPress={() => navigation.navigate('Checkout')}
          size="lg"
          fullWidth
          rightIcon={<ArrowRight size={18} color={colors.text.onPrimary} />}
        >
          Checkout
        </Button>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sellerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.lg,
  },
  list: {
    gap: spacing.sm,
  },
  footnote: {
    paddingHorizontal: spacing.md,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
