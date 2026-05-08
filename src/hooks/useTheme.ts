import { useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { COLORS, DARK_COLORS } from '../constants';

export function useTheme() {
  const scheme = useColorScheme();
  const preference = useAuthStore((s) => s.appUser?.themePreference);
  const isDark =
    preference === 'dark' ||
    (preference !== 'light' && scheme === 'dark');
  return isDark ? DARK_COLORS : COLORS;
}
