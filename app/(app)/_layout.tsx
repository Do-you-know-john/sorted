import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useHouseholdListener } from '../../src/hooks/useHousehold';

export default function AppLayout() {
  const appUser = useAuthStore((s) => s.appUser);
  useHouseholdListener(appUser?.activeHouseholdId ?? null);

  return <Stack screenOptions={{ headerShown: false }} />;
}
