import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radii } from '@/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'onLight' | 'onPrimary';
}

const SIZES = {
  sm: { box: 36, font: 18 },
  md: { box: 56, font: 28 },
  lg: { box: 80, font: 40 },
} as const;

/**
 * Wordmark logo — "@ZAY" set in Playfair Display, contained in a rounded
 * tile. Used on Splash and Welcome screens. Avoids needing a bundled
 * image asset for the initial scaffold.
 */
export function Logo({ size = 'md', variant = 'onLight' }: LogoProps) {
  const s = SIZES[size];
  const isLight = variant === 'onLight';
  return (
    <View
      style={[
        styles.tile,
        {
          width: s.box * 2.2,
          height: s.box,
          backgroundColor: isLight ? colors.primary : colors.surface,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel="@ZAY"
    >
      <Text
        variant="h1"
        color={isLight ? 'text.onPrimary' : 'primary'}
        style={{ fontSize: s.font, lineHeight: s.font * 1.1 }}
        align="center"
      >
        @ZAY
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
});
