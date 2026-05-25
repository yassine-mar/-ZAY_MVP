import { View, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/theme';

interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorScreen({
  title = 'Something went wrong',
  message = "We couldn't load this content. Please check your connection and try again.",
  onRetry,
  retryLabel = 'Try again',
}: ErrorScreenProps) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <AlertTriangle size={28} color={colors.feedback.error} strokeWidth={1.8} />
      </View>
      <Text variant="h3" align="center">{title}</Text>
      <Text
        variant="bodySmall"
        color="text.secondary"
        align="center"
        style={styles.message}
      >
        {message}
      </Text>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary" style={styles.action}>
          {retryLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    maxWidth: 320,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.md,
    minWidth: 180,
  },
});
