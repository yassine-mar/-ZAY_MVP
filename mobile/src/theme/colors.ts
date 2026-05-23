/**
 * @ZAY brand palette + semantic tokens.
 * Reference these from components — never raw hex values.
 */
export const colors = {
  // Brand
  primary:        '#E8520A',
  primaryHover:   '#C04408',
  primaryMuted:   '#FBEADC',

  // Backgrounds
  background:     '#FAFAF7',  // warm off-white
  surface:        '#FFFFFF',
  surfaceMuted:   '#F5F4F0',

  // Text
  text: {
    primary:   '#1A1A1A',
    secondary: '#6B7280',
    tertiary:  '#9CA3AF',
    inverse:   '#FFFFFF',
    onPrimary: '#FFFFFF',
  },

  // Borders & dividers
  border:        '#E5E7EB',
  borderStrong:  '#D1D5DB',
  borderFocus:   '#E8520A',

  // Order statuses
  status: {
    pending:    '#F59E0B',
    accepted:   '#10B981',
    preparing:  '#3B82F6',
    ready:      '#8B5CF6',
    delivered:  '#059669',
    cancelled:  '#EF4444',
  },

  // Semantic feedback
  feedback: {
    success: '#10B981',
    warning: '#F59E0B',
    error:   '#EF4444',
    info:    '#3B82F6',
  },

  // Overlays & shadows
  overlay:  'rgba(0, 0, 0, 0.5)',
  shadow:   'rgba(0, 0, 0, 0.08)',
} as const;
