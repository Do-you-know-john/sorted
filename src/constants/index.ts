export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_TTL_HOURS = 48;

export const COLORS = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  success: '#10B981',
  successLight: '#ECFDF5',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  white: '#FFFFFF',
  card: '#FFFFFF',
} as const;

export const DARK_COLORS = {
  primary: '#818CF8',
  primaryLight: '#1E1B4B',
  danger: '#F87171',
  dangerLight: '#450A0A',
  warning: '#FBBF24',
  warningLight: '#451A03',
  success: '#34D399',
  successLight: '#022C22',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
  background: '#111827',
  white: '#FFFFFF',
  card: '#1F2937',
} as const;

export type Colors = typeof COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
