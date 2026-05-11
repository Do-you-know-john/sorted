import { useEffect, useRef } from 'react';
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

  // Ref keeps segments readable inside the effect without making them a
  // reactive dependency — navigation must not re-trigger the routing effect.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segmentsRef.current[0] === '(auth)';
    const inApp = segmentsRef.current[0] === '(app)';

    const hasHousehold =
      !!appUser?.activeHouseholdId || (appUser?.householdIds?.length ?? 0) > 0;

    if (!firebaseUser && !inAuth) {
      router.replace('/(auth)/login');
    } else if (firebaseUser && inAuth) {
      if (hasHousehold) {
        router.replace('/(app)/(tabs)/(home)');
      } else if (appUser) {
        router.replace('/(app)/household/setup');
      }
    } else if (firebaseUser && inApp && appUser && !hasHousehold) {
      router.replace('/(app)/household/setup');
    }
  }, [firebaseUser?.uid, appUser?.uid, appUser?.activeHouseholdId, appUser?.householdIds?.length, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
