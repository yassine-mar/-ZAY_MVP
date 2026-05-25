import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { MapPin, Star, Circle } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, radii, shadows, spacing } from '@/theme';
import type { SellerSummary } from '@/types/domain.types';

interface Props {
  seller: SellerSummary;
  onPress: (seller: SellerSummary) => void;
}

function SellerCardImpl({ seller, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(seller)}
      accessibilityRole="button"
      accessibilityLabel={`${seller.business_name}, ${seller.city}`}
      style={({ pressed }) => [
        styles.root,
        shadows.sm,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Avatar uri={seller.avatar_url} name={seller.business_name} size={56} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text variant="bodyBold" numberOfLines={1} style={styles.name}>
            {seller.business_name}
          </Text>
          {seller.is_open ? (
            <View style={styles.openBadge}>
              <Circle size={6} color={colors.feedback.success} fill={colors.feedback.success} />
              <Text variant="caption" color="feedback.success">Open</Text>
            </View>
          ) : (
            <View style={styles.closedBadge}>
              <Circle size={6} color={colors.text.tertiary} fill={colors.text.tertiary} />
              <Text variant="caption" color="text.tertiary">Closed</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <MapPin size={12} color={colors.text.secondary} />
          <Text variant="caption" color="text.secondary" numberOfLines={1}>
            {seller.city}
          </Text>
          {seller.rating != null ? (
            <>
              <Text variant="caption" color="text.tertiary"> • </Text>
              <Star size={12} color={colors.feedback.warning} fill={colors.feedback.warning} />
              <Text variant="caption" color="text.secondary">
                {seller.rating.toFixed(1)}
              </Text>
            </>
          ) : null}
        </View>
        <Text variant="caption" color="text.tertiary">
          {seller.item_count} items · delivers within {seller.delivery_radius_km} km
        </Text>
      </View>
    </Pressable>
  );
}

export const SellerCard = memo(SellerCardImpl);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: radii.full,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
  },
});
