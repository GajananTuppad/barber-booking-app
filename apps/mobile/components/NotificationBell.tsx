import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useUnreadNotificationCount();

  return (
    <Pressable onPress={() => router.push('/notifications')} className="relative p-1">
      <Text style={{ fontSize: 22, color: colors.text }}>🔔</Text>
      {unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[16px] items-center justify-center rounded-full bg-danger px-1">
          <Text className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
