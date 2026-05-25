import { View, StyleSheet } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  caption?: string;
  /** Optional accent color for the value. Used to mark warnings/alerts. */
  accent?: 'primary' | 'warning' | 'error' | 'success';
}

const ACCENT_COLOR: Record<NonNullable<Props['accent']>, string> = {
  primary: colors.primary,
  warning: colors.feedback.warning,
  error: colors.feedback.error,
  success: colors.feedback.success,
};

/**
 * KPI card for the dashboard. Compact, scannable at a glance.
 */
export function StatCard({ label, value, icon: Icon, caption, accent = 'primary' }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text variant="caption" color="text.secondary">{label}</Text>
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Icon size={14} color={ACCENT_COLOR[accent]} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      <Text
        variant="h2"
        style={{ color: ACCENT_COLOR[accent], marginTop: spacing.xs }}
      >
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" color="text.tertiary" style={{ marginTop: 2 }} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
