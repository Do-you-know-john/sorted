import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useHouseholdListener } from '../../src/hooks/useHousehold';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants';

export default function AppLayout() {
  const appUser = useAuthStore((s) => s.appUser);
  useHouseholdListener(appUser?.activeHouseholdId ?? null);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { borderTopColor: COLORS.border },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon label="⌂" color={color} /> }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'To-Dos',
          tabBarIcon: ({ color }) => <TabIcon label="✓" color={color} />,
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="household"
        options={{ title: 'Haushalt', tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} /> }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}
