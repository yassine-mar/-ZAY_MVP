import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { formatPrice } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

interface Props {
  subtotal: number;
  /** Allow optional surfaces to break out fees later (delivery, etc.). */
  rows?: Array<{ label: string; value: number }>;
}

export function CartSummary({ subtotal, rows }: Props) {
  return (
    <View style={styles.root}>
      <Row label="Subtotal" value={subtotal} muted />
      {rows?.map((r) => <Row key={r.label} label={r.label} value={r.value} muted />)}
      <View style={styles.divider} />
      <Row label="Total" value={subtotal + (rows?.reduce((s, r) => s + r.value, 0) ?? 0)} bold />
    </View>
  );
}

function Row({
  label,
  value,
  muted = false,
  bold = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text variant={bold ? 'bodyBold' : 'body'} color={muted ? 'text.secondary' : 'text.primary'}>
        {label}
      </Text>
      <Text variant={bold ? 'bodyBold' : 'body'} color={bold ? 'primary' : 'text.primary'}>
        {formatPrice(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
