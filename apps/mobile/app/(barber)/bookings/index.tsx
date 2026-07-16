import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarberBookingCard } from '../../../components/BarberBookingCard';
import { trpc } from '../../../lib/trpc';
import { useBarberBookingsBadge } from '../../../providers/BarberBookingsProvider';

const TABS = ['New', 'Upcoming', 'Completed'] as const;
type Tab = (typeof TABS)[number];

export default function BarberBookingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('New');
  const bookingsQuery = trpc.booking.getBarberBookings.useQuery();
  const { markSeen } = useBarberBookingsBadge();

  useFocusEffect(
    useCallback(() => {
      markSeen();
    }, [markSeen]),
  );

  const grouped = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    return {
      New: bookings.filter((b) => b.status === 'pending'),
      Upcoming: bookings.filter((b) => b.status === 'confirmed'),
      Completed: bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled'),
    };
  }, [bookingsQuery.data]);

  const list = grouped[tab];

  return (
    <View className="flex-1 bg-bg pt-16">
      <Text className="mb-4 px-4 text-2xl font-bold text-white">Bookings</Text>

      <View className="mb-4 flex-row px-4">
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`mr-4 pb-2 ${tab === t ? 'border-b-2 border-gold' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === t ? 'text-gold' : 'text-muted'}`}>
              {t}
              {t === 'New' && grouped.New.length > 0 ? ` (${grouped.New.length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {bookingsQuery.isLoading ? (
          <Text className="text-muted">Loading…</Text>
        ) : list.length === 0 ? (
          <Text className="text-muted">No {tab.toLowerCase()} bookings.</Text>
        ) : (
          list.map((booking) => (
            <BarberBookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/(barber)/bookings/${booking.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
