import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography, type TypographyVariant } from '@/theme';

type ColorPath =
  | `text.${keyof typeof colors.text}`
  | `feedback.${keyof typeof colors.feedback}`
  | `status.${keyof typeof colors.status}`
  | 'primary'
  | 'primaryHover';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorPath;
  align?: 'left' | 'center' | 'right';
}

function resolveColor(path: ColorPath): string {
  const segments = path.split('.') as [string, string?];
  const root = colors as unknown as Record<string, string | Record<string, string>>;
  if (segments.length === 1) {
    const v = root[segments[0]];
    return typeof v === 'string' ? v : colors.text.primary;
  }
  const group = root[segments[0]];
  if (typeof group === 'object') {
    return group[segments[1]!] ?? colors.text.primary;
  }
  return colors.text.primary;
}

/**
 * Theme-aware Text wrapper.
 *   <Text variant="h1" color="text.primary">Welcome</Text>
 *
 * The native `Text` component is intentionally NOT re-exported with a
 * default font — components that forget to set a variant will fall back
 * to system font, which is a visible bug in design review.
 */
export function Text({
  variant = 'body',
  color = 'text.primary',
  align = 'left',
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={StyleSheet.flatten([
        typography[variant],
        { color: resolveColor(color), textAlign: align },
        style,
      ])}
      {...rest}
    />
  );
}
