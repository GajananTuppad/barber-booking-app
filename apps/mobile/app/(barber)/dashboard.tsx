import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarberBookingCard } from '../../components/BarberBookingCard';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../providers/AuthProvider';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCountdown(target: Date): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Now';
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function BarberDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const bookingsQuery = trpc.booking.getBarberBookings.useQuery();
  const earningsQuery = trpc.vendor.getEarnings.useQuery({ period: 'today' });

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (bookingsQuery.data ?? [])
      .filter((b) => b.status === 'pending' || b.status === 'confirmed')
      .filter((b) => b.slot && new Date(b.slot.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.slot?.start_time ?? 0).getTime() - new Date(b.slot?.start_time ?? 0).getTime());
  }, [bookingsQuery.data]);

  const todayBookings = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return (bookingsQuery.data ?? []).filter((b) => {
      if (!b.slot) return false;
      const start = new Date(b.slot.start_time);
      return start >= startOfDay && start < endOfDay;
    });
  }, [bookingsQuery.data]);

  const nextAppointment = upcoming[0];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pb-8 pt-16">
      <Text className="mb-1 text-2xl font-bold text-white">
        {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
      </Text>
      <Text className="mb-6 text-muted">Here&apos;s what&apos;s happening today.</Text>

      <View className="mb-6 flex-row gap-3">
        <View className="flex-1 rounded-card border border-border bg-card p-4">
          <Text className="text-xs text-muted">Bookings today</Text>
          <Text className="mt-1 text-2xl font-bold text-white">{todayBookings.length}</Text>
        </View>
        <View className="flex-1 rounded-card border border-border bg-card p-4">
          <Text className="text-xs text-muted">Earnings today</Text>
          <Text className="mt-1 text-2xl font-bold text-gold">₹{earningsQuery.data?.total ?? 0}</Text>
        </View>
      </View>

      <View className="mb-6 rounded-card border border-border bg-card p-4">
        <Text className="text-xs text-muted">Next appointment</Text>
        {nextAppointment && nextAppointment.slot ? (
          <>
            <Text className="mt-1 text-lg font-semibold text-white">
              {nextAppointment.customer?.full_name ?? 'Customer'} · {nextAppointment.service?.name}
            </Text>
            <Text className="text-gold">{formatCountdown(new Date(nextAppointment.slot.start_time))}</Text>
          </>
        ) : (
          <Text className="mt-1 text-white">No upcoming appointments</Text>
        )}
      </View>

      <View className="mb-6 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(barber)/slots/manage')}
          className="flex-1 items-center rounded-card border border-gold bg-gold/10 py-3"
        >
          <Text className="text-center text-xs font-medium text-gold">Add Slots</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(barber)/calendar')}
          className="flex-1 items-center rounded-card border border-border bg-card py-3"
        >
          <Text className="text-center text-xs font-medium text-white">View Calendar</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(barber)/profile')}
          className="flex-1 items-center rounded-card border border-border bg-card py-3"
        >
          <Text className="text-center text-xs font-medium text-white">Edit Services</Text>
        </Pressable>
      </View>

      <Text className="mb-3 text-lg font-semibold text-white">Upcoming Bookings</Text>
      {upcoming.length === 0 ? (
        <Text className="text-muted">No upcoming bookings.</Text>
      ) : (
        upcoming
          .slice(0, 3)
          .map((booking) => (
            <BarberBookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/(barber)/bookings/${booking.id}`)}
            />
          ))
      )}
    </ScrollView>
  );
}
