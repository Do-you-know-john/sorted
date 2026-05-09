import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { CalendarTabIcon } from '../../../src/components/CalendarTabIcon';

export default function TabsLayout() {
  const c = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon label="⌂" color={color} /> }}
      />
      <Tabs.Screen
        name="todos"
        options={{ title: 'To-Dos', tabBarIcon: ({ color }) => <TabIcon label="✓" color={color} /> }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: 'Einkauf', tabBarIcon: ({ color }) => <TabIcon label="🛒" color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Kalender', tabBarIcon: ({ color }) => <CalendarTabIcon color={color} size={26} /> }}
      />
      {/* Haushalt immer ganz rechts – neue Tabs vor diesem Screen einfügen */}
      <Tabs.Screen
        name="household"
        options={{ title: 'Haushalt', tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 26 }}>{label}</Text>;
}
