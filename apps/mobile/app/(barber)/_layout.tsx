import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../constants/theme';
import { BarberBookingsProvider, useBarberBookingsBadge } from '../../providers/BarberBookingsProvider';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, color: focused ? colors.gold : colors.textMuted }}>{glyph}</Text>;
}

function BarberTabs() {
  const { newCount } = useBarberBookingsBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarBadgeStyle: { backgroundColor: colors.danger },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ focused }) => <TabIcon glyph="🗓" focused={focused} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => <TabIcon glyph="📋" focused={focused} />,
          tabBarBadge: newCount > 0 ? newCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon glyph="◍" focused={focused} /> }}
      />
      <Tabs.Screen name="earnings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="slots/manage" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

export default function BarberLayout() {
  return (
    <BarberBookingsProvider>
      <BarberTabs />
    </BarberBookingsProvider>
  );
}
