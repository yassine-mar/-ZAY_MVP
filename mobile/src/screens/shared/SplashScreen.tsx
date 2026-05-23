import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

/**
 * Bridge screen shown while:
 *   1. expo-splash-screen is still painted (native), and
 *   2. authService.hydrate() validates the persisted token.
 *
 * Visually matches the native splash (brand background + wordmark) so
 * there is no visible jump when the native splash hides.
 */
export function SplashScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Logo size="lg" variant="onPrimary" />
      <Text
        variant="bodyMedium"
        color="text.onPrimary"
        align="center"
        style={styles.tagline}
      >
        Moroccan home cooking
      </Text>
      <ActivityIndicator color={colors.text.onPrimary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  tagline: {
    marginTop: spacing.lg,
    opacity: 0.85,
  },
  spinner: {
    position: 'absolute',
    bottom: spacing.xxxl,
  },
});
