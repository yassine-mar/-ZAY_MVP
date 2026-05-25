import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, ShoppingCart, Bell, Soup } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FoodCard } from '@/components/domain/FoodCard';
import { SellerCard } from '@/components/domain/SellerCard';
import { CategoryChip } from '@/components/domain/CategoryChip';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { browseApi } from '@/api/browse.api';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { colors, radii, spacing } from '@/theme';
import type { HomeStackScreenProps } from '@/types/navigation.types';

export function HomeScreen({ navigation }: HomeStackScreenProps<'Home'>) {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { count: unreadCount } = useUnreadNotifications();
  const firstName = user?.name.split(' ')[0] ?? 'there';

  /* Three parallel queries — load in parallel, render independently. */
  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => browseApi.categories(),
    staleTime: 5 * 60_000, // categories rarely change
  });

  const featuredQ = useQuery({
    queryKey: ['browse', 'featured'],
    queryFn: () => browseApi.featuredItems(),
  });

  const sellersQ = useQuery({
    queryKey: ['browse', 'sellers'],
    queryFn: () => browseApi.sellers({ page: 1, limit: 10 }),
  });

  const refreshing =
    categoriesQ.isFetching && featuredQ.isFetching && sellersQ.isFetching;

  const onRefresh = useCallback(() => {
    categoriesQ.refetch();
    featuredQ.refetch();
    sellersQ.refetch();
  }, [categoriesQ, featuredQ, sellersQ]);

  /* Hard error only when EVERY block failed — otherwise we render what we can. */
  if (categoriesQ.isError && featuredQ.isError && sellersQ.isError) {
    return (
      <SafeScreen>
        <Header
          firstName={firstName}
          cartCount={itemCount}
          unreadCount={unreadCount}
          onCart={() => navigation.navigate('Cart')}
          onNotifications={() => navigation.navigate('Notifications')}
        />
        <ErrorScreen onRetry={onRefresh} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <Header
        firstName={firstName}
        cartCount={itemCount}
        unreadCount={unreadCount}
        onCart={() => navigation.navigate('Cart')}
        onNotifications={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search trigger */}
        <Pressable
          onPress={() => navigation.navigate('Search')}
          accessibilityRole="search"
          accessibilityLabel="Search food and kitchens"
          style={({ pressed }) => [styles.searchTrigger, pressed && { opacity: 0.7 }]}
        >
          <SearchIcon size={18} color={colors.text.tertiary} />
          <Text variant="body" color="text.tertiary">
            Search tagine, couscous, kitchens…
          </Text>
        </Pressable>

        {/* Categories */}
        <Section
          title="Browse by category"
          actionLabel="See all"
          onAction={() => navigation.navigate('Categories')}
        >
          {categoriesQ.isLoading ? (
            <View style={styles.catRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.catSkel}>
                  <Skeleton width={56} height={56} borderRadius={28} />
                  <Skeleton width={56} height={12} />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {(categoriesQ.data?.categories ?? [])
                .filter((c) => c.is_active)
                .map((c) => (
                  <CategoryChip
                    key={c.id}
                    category={c}
                    variant="row"
                    onPress={() =>
                      navigation.navigate('Search', { categoryId: c.id })
                    }
                  />
                ))}
            </ScrollView>
          )}
        </Section>

        {/* Featured items */}
        <Section title="Featured today">
          {featuredQ.isLoading ? (
            <View style={styles.featuredRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width={220} height={210} borderRadius={radii.lg} />
              ))}
            </View>
          ) : (featuredQ.data?.items?.length ?? 0) === 0 ? (
            <View style={styles.inlineEmpty}>
              <Text variant="bodySmall" color="text.secondary">
                Nothing featured right now — explore kitchens below.
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredQ.data!.items}
              keyExtractor={(it) => it.id}
              contentContainerStyle={styles.featuredRow}
              renderItem={({ item }) => (
                <FoodCard
                  item={item}
                  layout="horizontal"
                  onPress={() =>
                    navigation.navigate('FoodDetails', { itemId: item.id })
                  }
                />
              )}
            />
          )}
        </Section>

        {/* Kitchens / sellers */}
        <Section title="Kitchens near you">
          {sellersQ.isLoading ? (
            <View style={{ gap: spacing.sm }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={92} borderRadius={radii.lg} />
              ))}
            </View>
          ) : (sellersQ.data?.items?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Soup}
              title="No kitchens yet"
              description="Check back soon — we're onboarding home cooks in your area."
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {sellersQ.data!.items.map((s) => (
                <SellerCard
                  key={s.id}
                  seller={s}
                  onPress={() =>
                    navigation.navigate('SellerProfile', { sellerId: s.id })
                  }
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </SafeScreen>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function Header({
  firstName,
  cartCount,
  unreadCount,
  onCart,
  onNotifications,
}: {
  firstName: string;
  cartCount: number;
  unreadCount: number;
  onCart: () => void;
  onNotifications: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text variant="caption" color="text.secondary">Hello,</Text>
        <Text variant="h3" numberOfLines={1}>{firstName}</Text>
      </View>
      <View style={styles.headerActions}>
        <IconButton
          onPress={onNotifications}
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
          variant="tinted"
          badge={unreadCount}
        >
          <Bell size={20} color={colors.text.primary} strokeWidth={1.8} />
        </IconButton>
        <IconButton
          onPress={onCart}
          accessibilityLabel={`Cart, ${cartCount} items`}
          variant="tinted"
          badge={cartCount}
        >
          <ShoppingCart size={20} color={colors.text.primary} strokeWidth={1.8} />
        </IconButton>
      </View>
    </View>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="h3">{title}</Text>
        {actionLabel && onAction ? (
          <Text variant="bodySmallMedium" color="primary" onPress={onAction}>
            {actionLabel}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerLeft: { gap: 0 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },

  scroll: {
    paddingBottom: spacing.xxl,
  },

  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  section: {
    marginBottom: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  catRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  catSkel: { alignItems: 'center', gap: spacing.xs, width: 80 },

  featuredRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  inlineEmpty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
