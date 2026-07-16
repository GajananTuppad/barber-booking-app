import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { AppButton } from '../../../components/AppButton';
import { BottomSheet } from '../../../components/BottomSheet';
import { colors } from '../../../constants/theme';
import { trpc } from '../../../lib/trpc';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const utils = trpc.useUtils();
  const { data: booking, isLoading } = trpc.booking.getById.useQuery({ bookingId: id ?? '' }, { enabled: Boolean(id) });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.getById.invalidate({ bookingId: id ?? '' });
      utils.booking.getMyBookings.invalidate();
      setConfirmVisible(false);
    },
    onError: (err) => Alert.alert('Could not cancel', err.message),
  });

  const reviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      setReviewVisible(false);
      Alert.alert('Thanks!', 'Your review has been posted.');
    },
    onError: (err) => Alert.alert('Could not post review', err.message),
  });

  if (isLoading || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  const barberName = booking.barber?.profile?.full_name ?? 'Barber';
  const salon = booking.barber?.salon;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canReview = booking.status === 'completed';

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-16">
        <Text className="mb-1 text-2xl font-bold text-white">{booking.service?.name}</Text>
        <Text className="mb-4 capitalize text-muted">{booking.status}</Text>

        <View className="mb-4 rounded-card border border-border bg-card p-4">
          <Text className="text-sm text-muted">Barber</Text>
          <Text className="mb-2 text-white">{barberName}</Text>
          <Text className="text-sm text-muted">Salon</Text>
          <Text className="mb-2 text-white">{salon?.name}</Text>
          <Text className="text-sm text-muted">Address</Text>
          <Text className="mb-2 text-white">{salon?.address ?? 'Not available'}</Text>
          {booking.slot ? (
            <>
              <Text className="text-sm text-muted">Time</Text>
              <Text className="text-white">{new Date(booking.slot.start_time).toLocaleString()}</Text>
            </>
          ) : null}
          <Text className="mt-2 text-sm text-muted">Total paid</Text>
          <Text className="text-lg font-bold text-gold">₹{booking.total_amount}</Text>
        </View>

        {salon?.lat != null && salon?.lng != null ? (
          <View className="mb-4 h-40 overflow-hidden rounded-card border border-border">
            <MapView
              style={{ flex: 1 }}
              scrollEnabled={false}
              zoomEnabled={false}
              initialRegion={{
                latitude: salon.lat,
                longitude: salon.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker coordinate={{ latitude: salon.lat, longitude: salon.lng }} title={salon.name} />
            </MapView>
          </View>
        ) : null}

        {canCancel ? (
          <AppButton label="Cancel Booking" variant="secondary" onPress={() => setConfirmVisible(true)} />
        ) : null}
        {canReview ? (
          <View className="mt-3">
            <AppButton label="Leave Review" onPress={() => setReviewVisible(true)} />
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet visible={confirmVisible} onClose={() => setConfirmVisible(false)}>
        <Text className="mb-2 text-lg font-semibold text-white">Cancel this booking?</Text>
        <Text className="mb-4 text-muted">Cancellations within 1 hour of booking are automatically refunded.</Text>
        <AppButton
          label="Yes, cancel"
          variant="secondary"
          loading={cancelMutation.isPending}
          onPress={() => cancelMutation.mutate({ bookingId: booking.id })}
        />
        <View className="h-2" />
        <AppButton label="Keep booking" onPress={() => setConfirmVisible(false)} />
      </BottomSheet>

      <BottomSheet visible={reviewVisible} onClose={() => setReviewVisible(false)}>
        <Text className="mb-4 text-lg font-semibold text-white">Leave a review</Text>
        <View className="mb-4 flex-row">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Text style={{ fontSize: 28, color: star <= rating ? colors.gold : colors.border }}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          placeholder="Share your experience (optional)"
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          className="mb-4 min-h-[80px] rounded-card border border-border bg-input px-4 py-3 text-white"
        />
        <AppButton
          label="Submit Review"
          loading={reviewMutation.isPending}
          onPress={() => reviewMutation.mutate({ bookingId: booking.id, rating, comment: comment || undefined })}
        />
      </BottomSheet>
    </View>
  );
}
