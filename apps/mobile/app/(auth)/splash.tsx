import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { BarberPole } from '../../components/BarberPole';

export default function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-8">
      <BarberPole />

      <Text className="mt-8 text-4xl font-bold tracking-wide text-gold">Shravkash</Text>
      <Text className="mt-2 text-center text-base text-muted">Book your next great haircut, anywhere.</Text>

      <View className="mt-12 w-full">
        <Link href="/(auth)/signup" asChild>
          <AppButton label="Get Started" variant="primary" size="lg" />
        </Link>
        <View className="h-3" />
        <Link href="/(auth)/login" asChild>
          <AppButton label="Log In" variant="secondary" size="lg" />
        </Link>
      </View>
    </View>
  );
}
