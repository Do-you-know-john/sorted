import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function TabsLayout() {
  const c = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 6,
        },
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
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Einkauf',
          tabBarIcon: ({ color }) => <TabIcon label="🛒" color={color} />,
        }}
      />
      <Tabs.Screen
        name="household"
        options={{ title: 'Haushalt', tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}
