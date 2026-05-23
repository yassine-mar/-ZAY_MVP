import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

type Role = 'customer' | 'seller';

interface Props {
  value: Role;
  onChange: (role: Role) => void;
}

const OPTIONS: { value: Role; label: string }[] = [
  { value: 'customer', label: "I'm a customer" },
  { value: 'seller',   label: "I'm a seller" },
];

/**
 * Segmented control used on RegisterScreen. Two equal pills inside a
 * muted track; the active pill paints onto the surface color with a
 * subtle border.
 */
export function RoleToggle({ value, onChange }: Props) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text
              variant="bodySmallMedium"
              color={active ? 'primary' : 'text.secondary'}
              align="center"
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
});
