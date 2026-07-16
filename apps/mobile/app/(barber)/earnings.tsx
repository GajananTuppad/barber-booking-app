import { ScrollView, Text, View } from 'react-native';
import { EarningsBarChart } from '../../components/EarningsBarChart';
import { trpc } from '../../lib/trpc';

export default function BarberEarningsScreen() {
  const weekQuery = trpc.vendor.getEarnings.useQuery({ period: 'week' });
  const monthQuery = trpc.vendor.getEarnings.useQuery({ period: 'month' });
  const dailyQuery = trpc.vendor.getDailyEarnings.useQuery({ days: 30 });
  const bookingsQuery = trpc.booking.getBarberBookings.useQuery();
  const payoutsQuery = trpc.vendor.getPayouts.useQuery();

  const recentBookings = (bookingsQuery.data ?? [])
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  const payouts = payoutsQuery.data ?? [];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pb-8 pt-16">
      <Text className="mb-6 text-2xl font-bold text-white">Earnings</Text>

      <View className="mb-6 flex-row gap-3">
        <View className="flex-1 rounded-card border border-border bg-card p-4">
          <Text className="text-xs text-muted">This week</Text>
          <Text className="mt-1 text-xl font-bold text-gold">₹{weekQuery.data?.total ?? 0}</Text>
        </View>
        <View className="flex-1 rounded-card border border-border bg-card p-4">
          <Text className="text-xs text-muted">This month</Text>
          <Text className="mt-1 text-xl font-bold text-gold">₹{monthQuery.data?.total ?? 0}</Text>
        </View>
      </View>

      <Text className="mb-2 text-base font-semibold text-white">Last 30 days</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6 rounded-card border border-border bg-card p-3"
      >
        <EarningsBarChart data={dailyQuery.data ?? []} />
      </ScrollView>

      <Text className="mb-2 text-base font-semibold text-white">Recent bookings</Text>
      <View className="mb-6 rounded-card border border-border bg-card">
        {recentBookings.length === 0 ? (
          <Text className="p-4 text-muted">No bookings yet.</Text>
        ) : (
          recentBookings.map((booking, i) => (
            <View
              key={booking.id}
              className={`flex-row items-center justify-between p-3 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-sm text-white">{booking.customer?.full_name ?? 'Customer'}</Text>
                <Text className="text-xs text-muted">
                  {booking.service?.name} · {new Date(booking.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="font-semibold text-gold">₹{booking.total_amount}</Text>
            </View>
          ))
        )}
      </View>

      <Text className="mb-2 text-base font-semibold text-white">Payout history</Text>
      <View className="rounded-card border border-border bg-card">
        {payouts.length === 0 ? (
          <Text className="p-4 text-muted">No payouts yet.</Text>
        ) : (
          payouts.map((payout, i) => (
            <View
              key={payout.id}
              className={`flex-row items-center justify-between p-3 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <View>
                <Text className="text-sm text-white">
                  {payout.period_start} – {payout.period_end}
                </Text>
                <Text className="text-xs capitalize text-muted">{payout.status}</Text>
              </View>
              <Text className="font-semibold text-gold">₹{payout.net_amount}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
