import { View, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { CategoryChip } from '@/components/domain/CategoryChip';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { browseApi } from '@/api/browse.api';
import { radii, spacing } from '@/theme';
import type { HomeStackScreenProps } from '@/types/navigation.types';

export function CategoriesScreen({ navigation }: HomeStackScreenProps<'Categories'>) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => browseApi.categories(),
    staleTime: 5 * 60_000,
  });

  if (isError) {
    return (
      <SafeScreen>
        <ScreenHeader title="Categories" onBack={() => navigation.goBack()} />
        <ErrorScreen onRetry={() => refetch()} />
      </SafeScreen>
    );
  }

  if (isLoading) {
    return (
      <SafeScreen>
        <ScreenHeader title="Categories" onBack={() => navigation.goBack()} />
        <View style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.cell}>
              <Skeleton height={120} borderRadius={radii.lg} />
            </View>
          ))}
        </View>
      </SafeScreen>
    );
  }

  const items = (data?.categories ?? []).filter((c) => c.is_active);

  return (
    <SafeScreen>
      <ScreenHeader title="Categories" onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <CategoryChip
              category={item}
              variant="tile"
              onPress={() => navigation.navigate('Search', { categoryId: item.id })}
            />
          </View>
        )}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  cell: {
    flex: 1,
  },
});
