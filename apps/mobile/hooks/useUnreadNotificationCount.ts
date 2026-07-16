import type { NotificationRow } from '@barber/shared';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export function useUnreadNotificationCount(): number {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) {
      setCount(0);
      return undefined;
    }
    const userId = session.user.id;
    let mounted = true;

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ count: initialCount }) => {
        if (mounted) setCount(initialCount ?? 0);
      });

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setCount((prev) => prev + 1),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as NotificationRow;
          if (updated.read) setCount((prev) => Math.max(0, prev - 1));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [session]);

  return count;
}
