import { View, StyleSheet, ScrollView } from 'react-native';
import { Ban, Mail } from 'lucide-react-native';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { SUPPORT_EMAIL } from '@/constants/config';
import { colors, radii, spacing } from '@/theme';

/**
 * Suspended state — used for both `users.status === 'suspended'` and
 * `seller_profile.status === 'suspended'`. Generic copy; the exact reason
 * isn't surfaced (admin handles that out of band).
 */
export function SuspendedScreen() {
  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ban size={36} color={colors.feedback.error} strokeWidth={1.8} />
        </View>

        <Text variant="h1" align="center">Account suspended</Text>
        <Text
          variant="body"
          color="text.secondary"
          align="center"
          style={styles.body}
        >
          Your account is currently paused. Reach out to our team and we'll help sort it out.
        </Text>

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
  actions: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
