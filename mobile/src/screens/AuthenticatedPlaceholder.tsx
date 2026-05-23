import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { spacing } from '@/theme';

/**
 * Stand-in for the post-login UI until the rest of the app is built.
 * Lets the auth flow be tested end-to-end (register → land here → log out).
 * Remove once CustomerTabs / SellerTabs / PendingSellerStack land.
 */
export function AuthenticatedPlaceholder() {
  const { user } = useAuth();

  return (
    <SafeScreen>
      <View style={styles.root}>
        <Text variant="h2" align="center">You're signed in</Text>
        <Text variant="body" color="text.secondary" align="center" style={styles.message}>
          Hi {user?.name ?? 'there'} — the home experience lands next.
        </Text>

        <View style={styles.info}>
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Role" value={user?.role ?? '—'} />
          {user?.seller_profile ? (
            <InfoRow label="Seller status" value={user.seller_profile.status} />
          ) : null}
        </View>

        <Button onPress={() => authService.logout()} variant="secondary" fullWidth>
          Log out
        </Button>
      </View>
    </SafeScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" color="text.secondary">{label}</Text>
      <Text variant="bodySmallMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  message: { marginTop: -spacing.sm },
  info: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
