import type { NotificationRow } from '@barber/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export default function NotificationsScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(notification: NotificationRow) {
    if (!notification.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    }

    const bookingId = (notification.data as Record<string, unknown> | null)?.bookingId;
    if (typeof bookingId === 'string') {
      const bookingsRoot = profile?.role === 'barber' ? '/(barber)/bookings' : '/(customer)/bookings';
      router.push(`${bookingsRoot}/${bookingId}`);
    }
  }

  return (
    <View className="flex-1 bg-bg pt-16">
      <View className="flex-row items-center px-4 pb-4">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-gold">← Back</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-white">Notifications</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.gold}
          />
        }
      >
        {loading ? (
          <Text className="text-muted">Loading…</Text>
        ) : notifications.length === 0 ? (
          <Text className="text-muted">No notifications yet.</Text>
        ) : (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handleOpen(notification)}
              className={`mb-2 rounded-card border p-3 ${
                notification.read ? 'border-border bg-card' : 'border-gold bg-gold/10'
              }`}
            >
              <Text className="font-semibold text-white">{notification.title}</Text>
              <Text className="mt-1 text-sm text-muted">{notification.body}</Text>
              <Text className="mt-1 text-xs text-muted">{new Date(notification.created_at).toLocaleString()}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
