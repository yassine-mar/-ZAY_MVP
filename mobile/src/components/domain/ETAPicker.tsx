import { useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

interface Props {
  value: number;
  onChange: (minutes: number) => void;
}

const PRESETS = [20, 30, 45, 60, 90, 120];

/**
 * Quick ETA picker — sellers tap a preset chip ("45 min from now") rather
 * than typing a time. Fast and finger-friendly when accepting orders.
 */
export function ETAPicker({ value, onChange }: Props) {
  const targetTimes = useMemo(() => {
    const now = new Date();
    return PRESETS.map((m) => {
      const t = new Date(now.getTime() + m * 60_000);
      return {
        minutes: m,
        label: t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
    });
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PRESETS.map((m, i) => {
          const isActive = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.chip,
                isActive ? styles.chipActive : styles.chipIdle,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                variant="bodyMedium"
                color={isActive ? 'text.onPrimary' : 'text.primary'}
              >
                {m} min
              </Text>
              <Text
                variant="caption"
                color={isActive ? 'text.onPrimary' : 'text.secondary'}
              >
                ready by {targetTimes[i]!.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    minWidth: 110,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 2,
  },
  chipIdle: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});
