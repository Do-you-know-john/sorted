import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useHouseholdListener } from '../../src/hooks/useHousehold';
import { useNotificationScheduler } from '../../src/hooks/useNotificationScheduler';
import { registerForPushNotifications } from '../../src/services/notifications';

export default function AppLayout() {
  const appUser = useAuthStore((s) => s.appUser);
  useHouseholdListener(appUser?.activeHouseholdId ?? null);
  useNotificationScheduler();

  useEffect(() => {
    if (appUser?.uid) {
      registerForPushNotifications(appUser.uid);
    }
  }, [appUser?.uid]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
