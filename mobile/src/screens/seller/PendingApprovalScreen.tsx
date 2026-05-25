import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Clock, Mail } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRefreshMe } from '@/hooks/useRefreshMe';
import { authService } from '@/services/auth.service';
import { SUPPORT_EMAIL } from '@/constants/config';
import { colors, radii, spacing } from '@/theme';

export function PendingApprovalScreen() {
  const { user } = useAuth();
  // Background poll every 60s + manual pull-to-refresh — covers both the
  // FCM-disabled case and the unreliable-Android-OEM case (Critique #1).
  const { refetch, isRefetching } = useRefreshMe();

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.iconWrap}>
          <Clock size={36} color={colors.primary} strokeWidth={1.8} />
        </View>

        <Text variant="h1" align="center">Application received</Text>
        <Text
          variant="body"
          color="text.secondary"
          align="center"
          style={styles.body}
        >
          Hi {user?.name.split(' ')[0]}, we're reviewing
          {user?.seller_profile?.business_name
            ? ` ${user.seller_profile.business_name}'s `
            : ' your '}
          application. This usually takes under 48 hours.
        </Text>

        <View style={styles.checklist}>
          <ChecklistRow
            done
            label="Account created"
          />
          <ChecklistRow
            done
            label="Business details submitted"
          />
          <ChecklistRow
            label="Manual review by our team"
            description="We'll send a notification once approved."
          />
        </View>

        <Text variant="caption" color="text.tertiary" align="center" style={styles.hint}>
          You can pull to refresh, or you'll receive a notification when ready.
        </Text>

        <View style={styles.actions}>
          <Button
            onPress={() => undefined /* mailto: lands in v1.1 */}
            variant="secondary"
            leftIcon={<Mail size={16} color={colors.text.primary} />}
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

function ChecklistRow({
  label,
  description,
  done = false,
}: {
  label: string;
  description?: string;
  done?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          { backgroundColor: done ? colors.feedback.success : colors.surfaceMuted },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={done ? 'text.primary' : 'text.secondary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="text.tertiary" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
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
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  body: {
    maxWidth: 360,
    marginTop: spacing.sm,
  },
  checklist: {
    marginTop: spacing.xl,
    gap: spacing.md,
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  hint: {
    marginTop: spacing.lg,
    maxWidth: 300,
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
