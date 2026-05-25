import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ChevronLeft, ShoppingCart } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FoodImage } from '@/components/ui/Image';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { IconButton } from '@/components/ui/IconButton';
import { PriceTag } from '@/components/domain/PriceTag';
import { QuantityStepper } from '@/components/domain/QuantityStepper';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { browseApi } from '@/api/browse.api';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/utils/format';
import { colors, radii, shadows, spacing } from '@/theme';
import type { HomeStackScreenProps } from '@/types/navigation.types';

export function FoodDetailsScreen({
  navigation,
  route,
}: HomeStackScreenProps<'FoodDetails'>) {
  const { itemId } = route.params;
  const insets = useSafeAreaInsets();
  const { addItem, itemCount } = useCart();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['browse', 'item', itemId],
    queryFn: () => browseApi.item(itemId),
  });

  /* Loading / error frames keep the hero shape so the back chevron remains. */
  if (isError) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={styles.overlayHeader}>
          <FloatingBack onPress={() => navigation.goBack()} />
        </SafeAreaView>
        <ErrorScreen onRetry={() => refetch()} />
      </View>
    );
  }

  if (isLoading || !data) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={styles.overlayHeader}>
          <FloatingBack onPress={() => navigation.goBack()} />
        </SafeAreaView>
        <Skeleton height={300} borderRadius={0} />
        <View style={styles.body}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" style={{ marginTop: spacing.sm }} />
          <Skeleton height={80} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    );
  }

  const { item } = data;
  const total = item.price * qty;
  const disabled = !item.is_available;

  const handleAdd = async () => {
    if (disabled || adding) return;
    if (!item.seller) {
      Toast.show({ type: 'error', text1: "We couldn't identify the kitchen for this item." });
      return;
    }
    setAdding(true);
    try {
      const added = await addItem(
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: qty,
          image_url: item.image_url,
        },
        { id: item.seller.id, name: item.seller.business_name },
      );
      if (added) {
        Toast.show({ type: 'success', text1: 'Added to cart' });
        navigation.goBack();
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        {/* Hero */}
        <FoodImage uri={item.image_url} style={styles.hero} />

        {/* Body card */}
        <View style={styles.body}>
          <Text variant="h1" numberOfLines={2}>{item.name}</Text>

          {item.seller ? (
            <Pressable
              onPress={() =>
                navigation.navigate('SellerProfile', { sellerId: item.seller!.id })
              }
              style={({ pressed }) => [styles.sellerRow, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.seller.business_name}`}
            >
              <Avatar
                uri={item.seller.avatar_url}
                name={item.seller.business_name}
                size={36}
              />
              <View style={styles.sellerInfo}>
                <Text variant="caption" color="text.tertiary">From the kitchen of</Text>
                <Text variant="bodySmallMedium" numberOfLines={1}>
                  {item.seller.business_name}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.priceRow}>
            <PriceTag amount={item.price} size="lg" />
            {!item.is_available ? (
              <Text variant="bodySmallMedium" color="feedback.error">
                Unavailable
              </Text>
            ) : null}
          </View>

          {item.description ? (
            <View style={styles.descriptionBlock}>
              <Text variant="bodySmall" color="text.secondary">
                {item.description}
              </Text>
            </View>
          ) : null}

          <View style={styles.qtyBlock}>
            <Text variant="bodyMedium">Quantity</Text>
            <QuantityStepper value={qty} onChange={setQty} min={1} max={20} />
          </View>
        </View>
      </ScrollView>

      {/* Floating header */}
      <SafeAreaView edges={['top']} style={styles.overlayHeader} pointerEvents="box-none">
        <FloatingBack onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }} />
        <FloatingCart count={itemCount} onPress={() => navigation.navigate('Cart')} />
      </SafeAreaView>

      {/* Sticky add-to-cart bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.totalBlock}>
          <Text variant="caption" color="text.secondary">Total</Text>
          <Text variant="h3">{formatPrice(total)}</Text>
        </View>
        <Button
          onPress={handleAdd}
          disabled={disabled}
          loading={adding}
          size="lg"
          style={styles.addBtn}
        >
          {disabled ? 'Currently unavailable' : 'Add to cart'}
        </Button>
      </View>
    </View>
  );
}

function FloatingBack({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      onPress={onPress}
      accessibilityLabel="Go back"
      variant="tinted"
      style={[styles.overlayBtn, { backgroundColor: colors.surface }]}
    >
      <ChevronLeft size={22} color={colors.text.primary} strokeWidth={2.2} />
    </IconButton>
  );
}

function FloatingCart({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <IconButton
      onPress={onPress}
      accessibilityLabel={`Cart, ${count} items`}
      variant="tinted"
      badge={count}
      style={[styles.overlayBtn, { backgroundColor: colors.surface }]}
    >
      <ShoppingCart size={20} color={colors.text.primary} strokeWidth={1.8} />
    </IconButton>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    zIndex: 10,
  },
  overlayBtn: {
    ...shadows.sm,
  },
  hero: {
    width: '100%',
    height: 320,
  },
  body: {
    backgroundColor: colors.background,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sellerInfo: { gap: 0 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  descriptionBlock: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  qtyBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalBlock: { gap: 0 },
  addBtn: { flex: 1 },
});
