import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { trpc } from '../../../lib/trpc';

export default function BarberBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.booking.getById.useQuery({ bookingId: id ?? '' }, { enabled: Boolean(id) });
  const markCompleteMutation = trpc.booking.markComplete.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ bookingId: id ?? '' });
      utils.booking.getBarberBookings.invalidate();
    },
    onError: (err) => Alert.alert('Could not update booking', err.message),
  });

  if (isLoading || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  const customer = booking.customer;
  const phone = customer?.phone ?? null;

  function handleCall() {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }

  function handleWhatsApp() {
    if (!phone) return;
    Linking.openURL(`https://wa.me/${phone.replace(/[^\d+]/g, '')}`);
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-16">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-gold">← Back</Text>
        </Pressable>

        <Text className="mb-1 text-2xl font-bold text-white">{booking.service?.name}</Text>
        <Text className="mb-4 capitalize text-muted">{booking.status}</Text>

        <View className="mb-4 rounded-card border border-border bg-card p-4">
          <Text className="text-sm text-muted">Customer</Text>
          <Text className="mb-2 text-white">{customer?.full_name ?? 'Customer'}</Text>
          {phone ? (
            <>
              <Text className="text-sm text-muted">Phone</Text>
              <Text className="mb-2 text-white">{phone}</Text>
            </>
          ) : null}
          {booking.slot ? (
            <>
              <Text className="text-sm text-muted">Time</Text>
              <Text className="mb-2 text-white">{new Date(booking.slot.start_time).toLocaleString()}</Text>
            </>
          ) : null}
          {booking.notes ? (
            <>
              <Text className="text-sm text-muted">Notes</Text>
              <Text className="mb-2 text-white">{booking.notes}</Text>
            </>
          ) : null}
          <Text className="mt-2 text-sm text-muted">Amount</Text>
          <Text className="text-lg font-bold text-gold">₹{booking.total_amount}</Text>
        </View>

        {phone ? (
          <View className="mb-4 flex-row gap-3">
            <Pressable onPress={handleCall} className="flex-1 items-center rounded-card border border-border bg-card py-3">
              <Text className="font-medium text-white">📞 Call</Text>
            </Pressable>
            <Pressable
              onPress={handleWhatsApp}
              className="flex-1 items-center rounded-card border border-success bg-success/10 py-3"
            >
              <Text className="font-medium text-success">WhatsApp</Text>
            </Pressable>
          </View>
        ) : null}

        {booking.status === 'confirmed' ? (
          <AppButton
            label="Mark Complete"
            loading={markCompleteMutation.isPending}
            onPress={() => markCompleteMutation.mutate({ bookingId: booking.id })}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
