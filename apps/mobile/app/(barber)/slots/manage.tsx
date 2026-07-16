import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { supabase } from '../../../lib/supabase';
import { trpc } from '../../../lib/trpc';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TIME_OPTIONS: string[] = [];
for (let hour = 7; hour <= 21; hour++) {
  for (const minute of [0, 30]) {
    if (hour === 21 && minute === 30) continue;
    TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }
}

interface GenerateAvailabilityResponse {
  created: number;
}

export default function AddSlotsScreen() {
  const router = useRouter();
  const { data: profileData } = trpc.vendor.getMyProfile.useQuery();
  const barberId = profileData?.barber.id;

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleGenerate() {
    if (!barberId) return;
    if (selectedDays.length === 0) {
      Alert.alert('Select at least one day');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      const schedule = selectedDays.map((dayOfWeek) => ({
        dayOfWeek,
        startTime,
        endTime,
        intervalMinutes,
      }));

      const { data, error } = await supabase.functions.invoke<GenerateAvailabilityResponse>('generate-availability', {
        body: { barberId, schedule },
      });
      if (error) throw new Error(error.message);

      Alert.alert('Slots generated', `Created ${data?.created ?? 0} new slots for the next 30 days.`);
      router.back();
    } catch (err) {
      Alert.alert('Could not generate slots', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-16">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-white">Add Slots</Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-2xl text-muted">×</Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-sm text-muted">Repeat on</Text>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {DAYS.map((day) => {
            const selected = selectedDays.includes(day.value);
            return (
              <Pressable
                key={day.value}
                onPress={() => toggleDay(day.value)}
                className={`rounded-full border px-4 py-2 ${selected ? 'border-gold bg-gold' : 'border-border bg-card'}`}
              >
                <Text className={`text-sm font-medium ${selected ? 'text-black' : 'text-white'}`}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm text-muted">Start time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-1">
          {TIME_OPTIONS.map((time) => (
            <Pressable
              key={time}
              onPress={() => setStartTime(time)}
              className={`mx-1 rounded-full border px-3 py-2 ${startTime === time ? 'border-gold bg-gold' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm ${startTime === time ? 'text-black' : 'text-white'}`}>{time}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text className="mb-2 text-sm text-muted">End time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-1">
          {TIME_OPTIONS.map((time) => (
            <Pressable
              key={time}
              onPress={() => setEndTime(time)}
              className={`mx-1 rounded-full border px-3 py-2 ${endTime === time ? 'border-gold bg-gold' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm ${endTime === time ? 'text-black' : 'text-white'}`}>{time}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text className="mb-2 text-sm text-muted">Interval</Text>
        <View className="mb-8 flex-row gap-2">
          {[30, 45, 60].map((minutes) => (
            <Pressable
              key={minutes}
              onPress={() => setIntervalMinutes(minutes)}
              className={`rounded-full border px-4 py-2 ${intervalMinutes === minutes ? 'border-gold bg-gold' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${intervalMinutes === minutes ? 'text-black' : 'text-white'}`}>
                {minutes} min
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-bg p-4">
        <AppButton label="Generate for 30 days" loading={submitting} onPress={handleGenerate} />
      </View>
    </View>
  );
}
