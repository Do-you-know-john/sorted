import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthListener } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/stores/authStore';
import '../src/i18n';

// Default to dark mode (not supported on web)
if (Platform.OS !== 'web') {
  Appearance.setColorScheme('dark');
}

export default function RootLayout() {
  useAuthListener();

  const { firebaseUser, appUser, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inApp = segments[0] === '(app)';

    const hasHousehold =
      !!appUser?.activeHouseholdId || (appUser?.householdIds?.length ?? 0) > 0;

    if (!firebaseUser && !inAuth) {
      router.replace('/(auth)/login');
    } else if (firebaseUser && inAuth) {
      if (hasHousehold) {
        router.replace('/(app)/(tabs)/(home)');
      } else if (appUser) {
        // appUser loaded and confirmed no households
        router.replace('/(app)/household/setup');
      }
    } else if (firebaseUser && inApp && appUser && !hasHousehold) {
      router.replace('/(app)/household/setup');
    }
  }, [firebaseUser, appUser, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
