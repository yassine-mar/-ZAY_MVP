import { Platform } from 'react-native';
import { colors } from './colors';

/**
 * Cross-platform shadows.
 * iOS uses shadow* props; Android uses elevation.
 * Each shadow gets both — RN will pick the right one per platform.
 */
const make = (offsetY: number, radius: number, opacity: number, elevation: number) =>
  Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {},
  })!;

export const shadows = {
  none: {},
  sm:   make(1, 2,  0.06, 2),
  md:   make(2, 6,  0.10, 4),
  lg:   make(4, 12, 0.14, 8),
} as const;

export type ShadowKey = keyof typeof shadows;
