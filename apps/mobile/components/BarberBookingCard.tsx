import type { AppRouter } from '@barber/shared';
import type { inferRouterOutputs } from '@trpc/server';
import { Pressable, Text, View } from 'react-native';

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type BarberBookingSummary = RouterOutputs['booking']['getBarberBookings'][number];

interface BarberBookingCardProps {
  booking: BarberBookingSummary;
  onPress?: () => void;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/20', text: 'text-warning', label: 'New' },
  confirmed: { bg: 'bg-success/20', text: 'text-success', label: 'Confirmed' },
  completed: { bg: 'bg-gold/20', text: 'text-gold', label: 'Completed' },
  cancelled: { bg: 'bg-border', text: 'text-muted', label: 'Cancelled' },
};

export function BarberBookingCard({ booking, onPress }: BarberBookingCardProps) {
  const badge = statusStyles[booking.status] ?? statusStyles.pending;
  const customerName = booking.customer?.full_name ?? 'Customer';
  const startTime = booking.slot ? new Date(booking.slot.start_time) : null;

  return (
    <Pressable onPress={onPress} className="mb-3 rounded-card border border-border bg-card p-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-input">
            <Text className="text-base font-semibold text-gold">{customerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-white" numberOfLines={1}>
              {customerName}
            </Text>
            <Text className="mt-1 text-sm text-white" numberOfLines={1}>
              {booking.service?.name ?? 'Service'}
            </Text>
            {startTime ? (
              <Text className="text-xs text-muted">
                {startTime.toLocaleDateString()} ·{' '}
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="items-end">
          <View className={`rounded-full px-2 py-1 ${badge.bg}`}>
            <Text className={`text-xs font-medium ${badge.text}`}>{badge.label}</Text>
          </View>
          <Text className="mt-2 text-sm font-semibold text-gold">₹{booking.total_amount}</Text>
        </View>
      </View>
    </Pressable>
  );
}
