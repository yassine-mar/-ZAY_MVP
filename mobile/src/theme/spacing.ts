/**
 * 8-pt spacing grid.
 * Every margin/padding/gap MUST come from here — never arbitrary numbers.
 */
export const spacing = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export type SpacingKey = keyof typeof spacing;
