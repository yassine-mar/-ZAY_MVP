import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { shadows } from './shadows';

/**
 * The global theme object. Imported statically (not via Context) for:
 *   - zero re-renders when read
 *   - IDE autocomplete
 *   - tree-shaking of unused tokens
 *
 * When dark mode lands (Phase 2), introduce useTheme() that reads
 * uiStore.theme; the token interface stays identical, only values change.
 */
export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
} as const;

export type Theme = typeof theme;

export { colors, typography, spacing, radii, shadows };
