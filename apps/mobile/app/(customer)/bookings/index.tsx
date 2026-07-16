import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BookingCard } from '../../../components/BookingCard';
import { trpc } from '../../../lib/trpc';

const TABS = ['Upcoming', 'Past', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

export default function MyBookingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Upcoming');

  const bookingsQuery = trpc.booking.getMyBookings.useQuery();
  const utils = trpc.useUtils();
  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.getMyBookings.invalidate();
    },
  });

  const grouped = useMemo(() => {
    const now = Date.now();
    const bookings = bookingsQuery.data ?? [];
    return {
      Upcoming: bookings.filter(
        (b) =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          (!b.slot || new Date(b.slot.start_time).getTime() >= now),
      ),
      Past: bookings.filter(
        (b) =>
          b.status === 'completed' ||
          (b.status === 'confirmed' && b.slot && new Date(b.slot.start_time).getTime() < now),
      ),
      Cancelled: bookings.filter((b) => b.status === 'cancelled'),
    };
  }, [bookingsQuery.data]);

  const list = grouped[tab];

  return (
    <View className="flex-1 bg-bg pt-16">
      <Text className="mb-4 px-4 text-2xl font-bold text-white">My Bookings</Text>

      <View className="mb-4 flex-row px-4">
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={`mr-4 pb-2 ${tab === t ? 'border-b-2 border-gold' : ''}`}>
            <Text className={`text-sm font-medium ${tab === t ? 'text-gold' : 'text-muted'}`}>{t}</Text>
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
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/(customer)/bookings/${booking.id}`)}
              onCancel={tab === 'Upcoming' ? () => cancelMutation.mutate({ bookingId: booking.id }) : undefined}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
