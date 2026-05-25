import { View, StyleSheet, ScrollView } from 'react-native';
import { XCircle, Mail } from 'lucide-react-native';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { SUPPORT_EMAIL } from '@/constants/config';
import { colors, radii, spacing } from '@/theme';

export function RejectedScreen() {
  const { user } = useAuth();
  const reason = user?.seller_profile?.rejection_reason;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <XCircle size={36} color={colors.feedback.error} strokeWidth={1.8} />
        </View>

        <Text variant="h1" align="center">Application not approved</Text>
        <Text
          variant="body"
          color="text.secondary"
          align="center"
          style={styles.body}
        >
          Thanks for applying. After review, we weren't able to approve your seller account.
        </Text>

        {reason ? (
          <View style={styles.reasonCard}>
            <Text variant="overline" color="text.secondary">Reason from our team</Text>
            <Text variant="body" style={{ marginTop: spacing.xs }}>
              {reason}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            onPress={() => undefined /* mailto in v1.1 */}
            leftIcon={<Mail size={16} color={colors.text.onPrimary} />}
          >
            Contact {SUPPORT_EMAIL}
          </Button>
          <Button onPress={() => authService.logout()} variant="ghost">
            Sign out
          </Button>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  body: {
    maxWidth: 360,
    marginTop: spacing.sm,
  },
  reasonCard: {
    marginTop: spacing.xl,
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
