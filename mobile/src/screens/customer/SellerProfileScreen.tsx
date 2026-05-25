import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Truck, Circle, ShoppingCart } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FoodCard } from '@/components/domain/FoodCard';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { browseApi } from '@/api/browse.api';
import { useCart } from '@/hooks/useCart';
import { colors, radii, spacing } from '@/theme';
import type { HomeStackScreenProps } from '@/types/navigation.types';

export function SellerProfileScreen({
  navigation,
  route,
}: HomeStackScreenProps<'SellerProfile'>) {
  const { sellerId } = route.params;
  const { itemCount } = useCart();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['browse', 'seller', sellerId],
    queryFn: () => browseApi.seller(sellerId),
  });

  const headerRight = (
    <IconButton
      onPress={() => navigation.navigate('Cart')}
      accessibilityLabel={`Cart, ${itemCount} items`}
      variant="tinted"
      badge={itemCount}
    >
      <ShoppingCart size={20} color={colors.text.primary} strokeWidth={1.8} />
    </IconButton>
  );

  if (isError) {
    return (
      <SafeScreen>
        <ScreenHeader onBack={() => navigation.goBack()} rightAction={headerRight} />
        <ErrorScreen onRetry={() => refetch()} />
      </SafeScreen>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeScreen>
        <ScreenHeader onBack={() => navigation.goBack()} rightAction={headerRight} />
        <View style={styles.profileBlock}>
          <Skeleton width={72} height={72} borderRadius={36} />
          <Skeleton width={180} height={20} />
          <Skeleton width={140} height={14} />
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={140} borderRadius={radii.lg} />
          ))}
        </View>
      </SafeScreen>
    );
  }

  const { seller } = data;

  return (
    <SafeScreen>
      <ScreenHeader
        title={seller.business_name}
        onBack={() => navigation.goBack()}
        rightAction={headerRight}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile block */}
        <View style={styles.profileBlock}>
          <Avatar uri={seller.avatar_url} name={seller.business_name} size={72} />
          <Text variant="h2" align="center">{seller.business_name}</Text>

          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text variant="bodySmall" color="text.secondary">
              {seller.city}
            </Text>
            <Text variant="bodySmall" color="text.tertiary">  ·  </Text>
            <Truck size={14} color={colors.text.secondary} />
            <Text variant="bodySmall" color="text.secondary">
              within {seller.delivery_radius_km} km
            </Text>
          </View>

          <View style={styles.statusRow}>
            {seller.is_open ? (
              <View style={styles.openBadge}>
                <Circle size={6} color={colors.feedback.success} fill={colors.feedback.success} />
                <Text variant="caption" color="feedback.success">Open now</Text>
              </View>
            ) : (
              <View style={styles.closedBadge}>
                <Circle size={6} color={colors.text.tertiary} fill={colors.text.tertiary} />
                <Text variant="caption" color="text.tertiary">Currently closed</Text>
              </View>
            )}
          </View>

          {seller.description ? (
            <Text
              variant="bodySmall"
              color="text.secondary"
              align="center"
              style={styles.description}
            >
              {seller.description}
            </Text>
          ) : null}
        </View>

        {/* Menus */}
        {seller.menus.length === 0 ? (
          <EmptyState
            title="No menu yet"
            description={`${seller.business_name} hasn't published a menu.`}
          />
        ) : (
          seller.menus.map((menu) => (
            <View key={menu.id} style={styles.menuBlock}>
              <View style={styles.menuHead}>
                <Text variant="h3">{menu.name}</Text>
                {menu.description ? (
                  <Text variant="bodySmall" color="text.secondary">
                    {menu.description}
                  </Text>
                ) : null}
              </View>

              {menu.items.length === 0 ? (
                <View style={styles.inlineEmpty}>
                  <Text variant="bodySmall" color="text.secondary">
                    No items in this menu.
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={menu.items}
                  keyExtractor={(it) => it.id}
                  contentContainerStyle={styles.menuList}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                  renderItem={({ item }) => (
                    <FoodCard
                      item={{
                        ...item,
                        seller: {
                          id: seller.id,
                          business_name: seller.business_name,
                          avatar_url: seller.avatar_url,
                        },
                      }}
                      layout="vertical"
                      onPress={() =>
                        navigation.navigate('FoodDetails', { itemId: item.id })
                      }
                    />
                  )}
                />
              )}
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  profileBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusRow: {
    marginTop: spacing.xs,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: radii.full,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
  },
  description: {
    maxWidth: 320,
    marginTop: spacing.sm,
  },
  menuBlock: {
    marginTop: spacing.lg,
  },
  menuHead: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 4,
  },
  menuList: {
    paddingHorizontal: spacing.lg,
  },
  inlineEmpty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skeletonList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
