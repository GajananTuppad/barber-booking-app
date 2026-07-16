import { FunctionsHttpError, type SlotRow } from '@barber/shared';
import { addDays, format, isSameDay } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { AppButton } from '../../../components/AppButton';
import { ServiceItem } from '../../../components/ServiceItem';
import { SlotButton, type SlotButtonStatus } from '../../../components/SlotButton';
import { supabase } from '../../../lib/supabase';
import { trpc } from '../../../lib/trpc';
import { useAuth } from '../../../providers/AuthProvider';

const SLOT_TAKEN_STATUS = 409;

const DAYS_AHEAD = 14;

interface BookSlotResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface ConfirmBookingResponse {
  bookingId: string;
  status: string;
}

export default function BookingFlowScreen() {
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)), []);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const dateKey = format(selectedDate ?? new Date(), 'yyyy-MM-dd');

  const { data: barber } = trpc.barber.getById.useQuery({ barberId: barberId ?? '' }, { enabled: Boolean(barberId) });
  const slotsQuery = trpc.barber.getSlots.useQuery(
    { barberId: barberId ?? '', date: dateKey },
    { enabled: Boolean(barberId) },
  );

  const [slots, setSlots] = useState<SlotRow[]>([]);
  useEffect(() => {
    setSlots(slotsQuery.data ?? []);
    setSelectedSlotId(null);
  }, [slotsQuery.data]);

  useEffect(() => {
    if (!barberId) return undefined;

    const channel = supabase
      .channel(`slots-${barberId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'slots', filter: `barber_id=eq.${barberId}` },
        (payload) => {
          const updated = payload.new as SlotRow;
          setSlots((prev) => prev.map((slot) => (slot.id === updated.id ? updated : slot)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);

  const selectedService = barber?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const canPay = Boolean(selectedSlot && selectedService && !paying && session);

  async function releaseSlotSilently(slotId: string) {
    try {
      await supabase.functions.invoke('release-slot', { body: { slotId } });
    } catch (releaseErr) {
      console.error('Failed to release slot after a failed booking attempt', releaseErr);
    }
  }

  async function handlePay() {
    if (!selectedSlot || !selectedService || !barberId || !session) return;

    setPaying(true);
    let slotLocked = false;
    try {
      const { data: bookData, error: bookError } = await supabase.functions.invoke<BookSlotResponse>('book-slot', {
        body: { slotId: selectedSlot.id, serviceId: selectedService.id, customerId: session.user.id },
      });
      if (bookError || !bookData) {
        if (bookError instanceof FunctionsHttpError && bookError.context.status === SLOT_TAKEN_STATUS) {
          Alert.alert('Slot just taken', 'Someone else booked this slot. Pick another time to continue.', [
            {
              text: 'OK',
              onPress: () => {
                setSelectedSlotId(null);
                slotsQuery.refetch();
              },
            },
          ]);
          return;
        }
        throw new Error(bookError?.message ?? 'Could not lock this slot');
      }
      slotLocked = true;

      // Best-effort biometric confirmation before charging the card — skipped
      // entirely on devices with no biometric hardware/enrollment so it never
      // blocks a payment outright.
      const hasBiometricHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasBiometricHardware && (await LocalAuthentication.isEnrolledAsync())) {
        const biometricResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to proceed with payment',
        });
        if (!biometricResult.success) {
          throw new Error('Biometric confirmation was cancelled');
        }
      }

      const paymentResult = await RazorpayCheckout.open({
        key: bookData.keyId,
        amount: bookData.amount,
        currency: bookData.currency,
        order_id: bookData.orderId,
        name: 'Shravkash',
        description: selectedService.name,
        prefill: {
          email: session.user.email ?? undefined,
          contact: profile?.phone ?? undefined,
        },
        theme: { color: '#C9A84C' },
      });

      const { data: confirmData, error: confirmError } = await supabase.functions.invoke<ConfirmBookingResponse>(
        'confirm-booking',
        {
          body: {
            razorpayPaymentId: paymentResult.razorpay_payment_id,
            razorpayOrderId: paymentResult.razorpay_order_id,
            razorpaySignature: paymentResult.razorpay_signature,
            slotId: selectedSlot.id,
            serviceId: selectedService.id,
            customerId: session.user.id,
            barberId,
            amount: Number(selectedService.price),
          },
        },
      );
      if (confirmError || !confirmData) throw new Error(confirmError?.message ?? 'Could not confirm the booking');

      router.replace(`/(customer)/bookings/${confirmData.bookingId}`);
    } catch (err) {
      if (slotLocked) {
        await releaseSlotSilently(selectedSlot.id);
      }
      const message = err instanceof Error ? err.message : 'Payment was cancelled or failed';
      Alert.alert('Booking failed', message, [
        { text: 'Try again', onPress: () => handlePay() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setPaying(false);
    }
  }

  if (!barber) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-16">
        <Text className="mb-1 text-2xl font-bold text-white">Book with {barber.profile?.full_name ?? 'Barber'}</Text>
        <Text className="mb-6 text-muted">{barber.salon?.name}</Text>

        <Text className="mb-2 text-base font-semibold text-white">1. Choose a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-1">
          {days.map((day) => {
            const selected = isSameDay(day, selectedDate ?? new Date());
            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => setSelectedDate(day)}
                className={`mx-1 w-14 items-center rounded-card border py-2 ${
                  selected ? 'border-gold bg-gold/10' : 'border-border bg-card'
                }`}
              >
                <Text className={`text-xs ${selected ? 'text-gold' : 'text-muted'}`}>{format(day, 'EEE')}</Text>
                <Text className={`text-base font-semibold ${selected ? 'text-gold' : 'text-white'}`}>
                  {format(day, 'd')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-2 text-base font-semibold text-white">2. Pick a slot</Text>
        <View className="mb-6 flex-row flex-wrap">
          {slots.length === 0 ? (
            <Text className="text-muted">No slots for this day.</Text>
          ) : (
            slots.map((slot) => (
              <SlotButton
                key={slot.id}
                time={format(new Date(slot.start_time), 'h:mm a')}
                status={(slot.status === 'cancelled' ? 'booked' : slot.status) as SlotButtonStatus}
                selected={selectedSlotId === slot.id}
                onPress={() => setSelectedSlotId(slot.id)}
              />
            ))
          )}
        </View>

        <Text className="mb-2 text-base font-semibold text-white">3. Choose a service</Text>
        <View className="mb-6">
          {barber.services.map((service) => (
            <ServiceItem
              key={service.id}
              name={service.name}
              duration={service.duration_minutes}
              price={Number(service.price)}
              selected={selectedServiceId === service.id}
              onPress={() => setSelectedServiceId(service.id)}
            />
          ))}
        </View>

        <Text className="mb-2 text-base font-semibold text-white">4. Confirm</Text>
        <View className="mb-6 rounded-card border border-border bg-card p-4">
          {selectedSlot && selectedService ? (
            <>
              <Text className="text-white">{format(selectedDate ?? new Date(), 'EEEE, MMM d')}</Text>
              <Text className="text-white">{format(new Date(selectedSlot.start_time), 'h:mm a')}</Text>
              <Text className="mt-2 text-white">{selectedService.name}</Text>
              <Text className="mt-1 text-lg font-bold text-gold">₹{selectedService.price}</Text>
            </>
          ) : (
            <Text className="text-muted">Select a date, slot and service to continue.</Text>
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-bg p-4">
        <AppButton label="Proceed to Pay" disabled={!canPay} loading={paying} onPress={handlePay} />
      </View>
    </View>
  );
}
