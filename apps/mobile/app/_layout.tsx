import '../global.css';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { TRPCProvider } from '../providers/TRPCProvider';

function NavigationGuard() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inBarberGroup = segments[0] === '(barber)';
    const isBarber = profile?.role === 'barber';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
      return;
    }

    if (session && inAuthGroup) {
      router.replace(isBarber ? '/(barber)' : '/(customer)');
      return;
    }

    // Keep customers and barbers in their own tab group even if they
    // navigate to a stale deep link from the other role's group.
    if (session && isBarber && !inBarberGroup) {
      router.replace('/(barber)');
    } else if (session && !isBarber && inBarberGroup) {
      router.replace('/(customer)');
    }
  }, [session, profile, loading, segments, router]);

  useEffect(() => {
    // Tapping a push notification while the app is backgrounded/killed needs
    // to land on the right screen for whichever role this device is signed
    // in as — the (customer) and (barber) groups both have a bookings/[id]
    // route at the same bare pathname, so the target must be role-qualified.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const bookingId = response.notification.request.content.data?.bookingId;
      if (typeof bookingId !== 'string') return;

      const bookingsRoot = profile?.role === 'barber' ? '/(barber)/bookings' : '/(customer)/bookings';
      router.push(`${bookingsRoot}/${bookingId}`);
    });

    return () => subscription.remove();
  }, [profile, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TRPCProvider>
          <NavigationGuard />
        </TRPCProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
