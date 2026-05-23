import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check } from 'lucide-react-native';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
import type { AuthScreenProps } from '@/types/navigation.types';

const HIGHLIGHTS = [
  'Authentic family recipes',
  'From kitchens in your neighborhood',
  'Real-time order updates',
];

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Brand hero — primary-color background, content sits below */}
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.heroContent}>
          <Logo size="lg" variant="onPrimary" />
          <Text
            variant="bodyMedium"
            color="text.onPrimary"
            align="center"
            style={styles.tagline}
          >
            Moroccan home cooking,{'\n'}delivered to your door
          </Text>
        </View>
      </SafeAreaView>

      {/* Body card — sits over the hero with a soft top radius */}
      <View
        style={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md },
        ]}
      >
        <Text variant="h1" align="left">Welcome to @ZAY</Text>
        <Text variant="body" color="text.secondary" style={styles.lede}>
          Discover talented home cooks near you. Browse menus, order tagine,
          couscous and pastilla — fresh from the source.
        </Text>

        <View style={styles.highlights}>
          {HIGHLIGHTS.map((h) => (
            <View key={h} style={styles.highlightRow}>
              <View style={styles.checkBadge}>
                <Check size={14} color={colors.primary} strokeWidth={3} />
              </View>
              <Text variant="bodySmall" color="text.primary" style={styles.highlightText}>
                {h}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            onPress={() => navigation.navigate('Register')}
            rightIcon={<ArrowRight size={18} color={colors.text.onPrimary} />}
            fullWidth
            size="lg"
            accessibilityLabel="Get started — create an account"
          >
            Get started
          </Button>

          <View style={styles.signInRow}>
            <Text variant="bodySmall" color="text.secondary">
              Already have an account?{' '}
            </Text>
            <Text
              variant="bodySmallMedium"
              color="primary"
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="link"
            >
              Log in
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  tagline: {
    marginTop: spacing.lg,
    opacity: 0.95,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  lede: {
    marginTop: -spacing.xs,
  },
  highlights: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.md,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
