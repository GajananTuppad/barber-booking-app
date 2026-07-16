import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CalendarProvider, WeekCalendar, type DateData } from 'react-native-calendars';

type MarkedDatesMap = Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }>;
import { SlotButton, type SlotButtonStatus } from '../../components/SlotButton';
import { colors } from '../../constants/theme';
import { trpc } from '../../lib/trpc';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const calendarTheme = {
  backgroundColor: colors.bg,
  calendarBackground: colors.bg,
  textSectionTitleColor: colors.textMuted,
  selectedDayBackgroundColor: colors.gold,
  selectedDayTextColor: '#000000',
  todayTextColor: colors.gold,
  dayTextColor: '#FFFFFF',
  textDisabledColor: colors.border,
  dotColor: colors.gold,
  selectedDotColor: '#000000',
  arrowColor: colors.gold,
  monthTextColor: '#FFFFFF',
  indicatorColor: colors.gold,
};

export default function BarberCalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const { data: profileData } = trpc.vendor.getMyProfile.useQuery();
  const barberId = profileData?.barber.id;
  const bookingsQuery = trpc.booking.getBarberBookings.useQuery();
  const slotsQuery = trpc.barber.getSlots.useQuery(
    { barberId: barberId ?? '', date: selectedDate },
    { enabled: Boolean(barberId) },
  );

  const bookingCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookingsQuery.data ?? []) {
      if (!booking.slot || booking.status === 'cancelled') continue;
      const day = booking.slot.start_time.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return counts;
  }, [bookingsQuery.data]);

  const markedDates = useMemo<MarkedDatesMap>(() => {
    const marks: MarkedDatesMap = {};
    for (const day of bookingCountByDate.keys()) {
      marks[day] = { marked: true };
    }
    marks[selectedDate] = { ...(marks[selectedDate] ?? {}), selected: true, selectedColor: colors.gold };
    return marks;
  }, [bookingCountByDate, selectedDate]);

  const selectedDayBookingCount = bookingCountByDate.get(selectedDate) ?? 0;
  const slots = slotsQuery.data ?? [];

  return (
    <View className="flex-1 bg-bg pt-14">
      <Text className="mb-2 px-4 text-2xl font-bold text-white">Calendar</Text>

      <CalendarProvider date={selectedDate} onDateChanged={setSelectedDate}>
        <WeekCalendar
          firstDay={1}
          markedDates={markedDates}
          theme={calendarTheme}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        />
      </CalendarProvider>

      <View className="mt-4 flex-1 px-4">
        <Text className="mb-3 text-base font-semibold text-white">
          {selectedDayBookingCount} booking{selectedDayBookingCount === 1 ? '' : 's'} on {selectedDate}
        </Text>

        <ScrollView contentContainerClassName="flex-row flex-wrap pb-24">
          {slots.length === 0 ? (
            <Text className="text-muted">No slots on this day.</Text>
          ) : (
            slots.map((slot) => (
              <SlotButton
                key={slot.id}
                time={new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                status={(slot.status === 'cancelled' ? 'booked' : slot.status) as SlotButtonStatus}
              />
            ))
          )}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => router.push('/(barber)/slots/manage')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-gold"
      >
        <Text className="text-2xl font-bold text-black">+</Text>
      </Pressable>
    </View>
  );
}
