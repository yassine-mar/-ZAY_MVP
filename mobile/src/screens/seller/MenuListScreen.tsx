import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Plus, Pencil, BookOpen } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { MenuItemRow } from '@/components/domain/MenuItemRow';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { menusApi } from '@/api/menus.api';
import { itemsApi } from '@/api/items.api';
import { parseApiError } from '@/utils/error';
import { colors, radii, spacing } from '@/theme';
import type { Menu } from '@/types/domain.types';
import type { SellerMenuScreenProps } from '@/types/navigation.types';

export function MenuListScreen({ navigation }: SellerMenuScreenProps<'MenuList'>) {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['seller', 'menus'],
    queryFn: () => menusApi.list(),
  });

  // Optimistic availability toggle — flip the cached item immediately,
  // revert on failure. Sellers toggle often during the day.
  const toggleAvailability = useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) =>
      itemsApi.setAvailability(id, is_available),
    onMutate: async ({ id, is_available }) => {
      await qc.cancelQueries({ queryKey: ['seller', 'menus'] });
      const prev = qc.getQueryData<{ menus: Menu[] }>(['seller', 'menus']);
      if (prev) {
        qc.setQueryData(['seller', 'menus'], {
          menus: prev.menus.map((m) => ({
            ...m,
            items: m.items.map((it) => (it.id === id ? { ...it, is_available } : it)),
          })),
        });
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['seller', 'menus'], ctx.prev);
      Toast.show({ type: 'error', text1: parseApiError(err).message });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'menus'] });
    },
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const headerRight = (
    <IconButton
      onPress={() => navigation.navigate('AddEditMenu', {})}
      accessibilityLabel="Add menu"
      variant="tinted"
    >
      <Plus size={20} color={colors.text.primary} strokeWidth={2.2} />
    </IconButton>
  );

  if (isError) {
    return (
      <SafeScreen>
        <ScreenHeader title="Menu" rightAction={headerRight} />
        <ErrorScreen onRetry={onRefresh} />
      </SafeScreen>
    );
  }

  if (isLoading) {
    return (
      <SafeScreen>
        <ScreenHeader title="Menu" rightAction={headerRight} />
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={{ gap: spacing.sm }}>
              <Skeleton height={20} width="40%" />
              <Skeleton height={88} borderRadius={radii.lg} />
              <Skeleton height={88} borderRadius={radii.lg} />
            </View>
          ))}
        </View>
      </SafeScreen>
    );
  }

  const menus = data?.menus ?? [];

  if (menus.length === 0) {
    return (
      <SafeScreen>
        <ScreenHeader title="Menu" rightAction={headerRight} />
        <EmptyState
          icon={BookOpen}
          title="Create your first menu"
          description="Group your dishes into menus (Lunch, Dinner, Specials…) so customers can browse them clearly."
          actionLabel="Add menu"
          onAction={() => navigation.navigate('AddEditMenu', {})}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScreenHeader title="Menu" rightAction={headerRight} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {menus.map((menu) => (
          <View key={menu.id} style={styles.menuBlock}>
            <View style={styles.menuHead}>
              <View style={{ flex: 1 }}>
                <Text variant="h3">{menu.name}</Text>
                {menu.description ? (
                  <Text variant="caption" color="text.secondary" numberOfLines={2}>
                    {menu.description}
                  </Text>
                ) : null}
                <Text variant="caption" color="text.tertiary" style={{ marginTop: 2 }}>
                  {menu.items.length} {menu.items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('AddEditMenu', { menuId: menu.id })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${menu.name}`}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
              >
                <Pencil size={16} color={colors.text.secondary} />
              </Pressable>
            </View>

            {menu.items.length === 0 ? (
              <View style={styles.menuEmpty}>
                <Text variant="bodySmall" color="text.secondary" align="center">
                  No items in this menu yet.
                </Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {menu.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onPress={() =>
                      navigation.navigate('AddEditItem', {
                        menuId: menu.id,
                        itemId: item.id,
                      })
                    }
                    onToggleAvailability={(next) =>
                      toggleAvailability.mutate({ id: item.id, is_available: next })
                    }
                  />
                ))}
              </View>
            )}

            <Button
              onPress={() =>
                navigation.navigate('AddEditItem', { menuId: menu.id })
              }
              variant="ghost"
              leftIcon={<Plus size={16} color={colors.primary} />}
              style={styles.addItemBtn}
            >
              Add item
            </Button>
          </View>
        ))}

        <View style={styles.footerCta}>
          <Button
            onPress={() => navigation.navigate('AddEditMenu', {})}
            variant="secondary"
            leftIcon={<Plus size={16} color={colors.text.primary} />}
          >
            New menu
          </Button>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  menuBlock: {
    gap: spacing.sm,
  },
  menuHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuEmpty: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  addItemBtn: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.md,
  },
  footerCta: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
