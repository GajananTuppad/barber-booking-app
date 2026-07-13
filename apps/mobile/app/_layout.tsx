import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { TRPCProvider } from '../providers/TRPCProvider';

function NavigationGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
      return;
    }

    // Barber-side navigation isn't built yet, so every signed-in profile
    // lands in the customer tabs for now.
    if (session && inAuthGroup) {
      router.replace('/(customer)');
    }
  }, [session, loading, segments, router]);

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
