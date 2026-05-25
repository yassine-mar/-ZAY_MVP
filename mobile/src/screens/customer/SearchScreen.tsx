import { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X, SearchX } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FoodCard } from '@/components/domain/FoodCard';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { browseApi } from '@/api/browse.api';
import { useDebounce } from '@/hooks/useDebounce';
import { colors, radii, spacing } from '@/theme';
import type { HomeStackScreenProps } from '@/types/navigation.types';

export function SearchScreen({ navigation, route }: HomeStackScreenProps<'Search'>) {
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    route.params?.categoryId,
  );
  const debouncedQuery = useDebounce(query, 300);

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => browseApi.categories(),
    staleTime: 5 * 60_000,
  });

  // Only fetch results once we have *some* filter — empty + no category = idle.
  const shouldSearch = debouncedQuery.trim().length > 0 || !!categoryId;

  const resultsQ = useQuery({
    queryKey: ['browse', 'items', { search: debouncedQuery, categoryId }],
    queryFn: () =>
      browseApi.items({
        search: debouncedQuery || undefined,
        category_id: categoryId,
        page: 1,
        limit: 30,
      }),
    enabled: shouldSearch,
  });

  return (
    <SafeScreen>
      {/* Inline search header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <X size={22} color={colors.text.primary} strokeWidth={2} />
        </Pressable>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search tagine, couscous, kitchens…"
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          containerStyle={styles.searchInput}
          leftAdornment={<SearchIcon size={18} color={colors.text.tertiary} />}
          rightAdornment={
            query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={colors.text.secondary} />
              </Pressable>
            ) : null
          }
        />
      </View>

      {/* Category filter row */}
      {!categoriesQ.isLoading && categoriesQ.data ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip
            label="All"
            selected={!categoryId}
            onPress={() => setCategoryId(undefined)}
          />
          {categoriesQ.data.categories
            .filter((c) => c.is_active)
            .map((c) => (
              <Chip
                key={c.id}
                label={`${c.icon ?? '🍽️'}  ${c.name}`}
                selected={categoryId === c.id}
                onPress={() =>
                  setCategoryId(categoryId === c.id ? undefined : c.id)
                }
              />
            ))}
        </ScrollView>
      ) : null}

      {/* Results */}
      {!shouldSearch ? (
        <EmptyState
          icon={SearchIcon}
          title="What are you craving?"
          description="Search by name (e.g. tagine, harira) or pick a category above."
        />
      ) : resultsQ.isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={140} borderRadius={radii.lg} />
          ))}
        </View>
      ) : resultsQ.isError ? (
        <ErrorScreen onRetry={() => resultsQ.refetch()} />
      ) : (resultsQ.data?.items?.length ?? 0) === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matches"
          description={
            debouncedQuery
              ? `Nothing matches "${debouncedQuery}". Try a different word.`
              : 'No items in this category yet.'
          }
        />
      ) : (
        <FlatList
          data={resultsQ.data!.items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.resultsList}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FoodCard
              item={item}
              layout="vertical"
              onPress={() => navigation.navigate('FoodDetails', { itemId: item.id })}
            />
          )}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  skeletonList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultsList: {
    padding: spacing.lg,
  },
});
