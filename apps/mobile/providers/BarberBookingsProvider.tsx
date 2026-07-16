import type { BookingRow } from '@barber/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Vibration } from 'react-native';
import { supabase } from '../lib/supabase';
import { trpc } from '../lib/trpc';

interface BarberBookingsContextValue {
  newCount: number;
  markSeen: () => void;
}

const BarberBookingsContext = createContext<BarberBookingsContextValue>({ newCount: 0, markSeen: () => {} });

/** Tracks unseen incoming bookings for the barber tab badge via a realtime subscription. */
export function BarberBookingsProvider({ children }: { children: ReactNode }) {
  const { data: profileData } = trpc.vendor.getMyProfile.useQuery();
  const barberId = profileData?.barber.id;
  const utils = trpc.useUtils();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!barberId) return undefined;

    const channel = supabase
      .channel(`barber-bookings-${barberId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `barber_id=eq.${barberId}` },
        (payload) => {
          const inserted = payload.new as BookingRow;
          if (inserted.status === 'pending' || inserted.status === 'confirmed') {
            setNewCount((prev) => prev + 1);
            Vibration.vibrate(200);
            utils.booking.getBarberBookings.invalidate();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId, utils]);

  function markSeen() {
    setNewCount(0);
  }

  return <BarberBookingsContext.Provider value={{ newCount, markSeen }}>{children}</BarberBookingsContext.Provider>;
}

export function useBarberBookingsBadge(): BarberBookingsContextValue {
  return useContext(BarberBookingsContext);
}
