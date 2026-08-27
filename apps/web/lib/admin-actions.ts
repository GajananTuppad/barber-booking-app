'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from './supabase-admin';

const COMMISSION_RATE = 0.05;

export async function setSalonActive(salonId: string, isActive: boolean): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('salons').update({ is_active: isActive }).eq('id', salonId);
  if (error) throw new Error(error.message);
  revalidatePath('/salons');
  revalidatePath(`/salons/${salonId}`);
}

export async function setBarberAvailability(barberId: string, isAvailable: boolean): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('barbers').update({ is_available: isAvailable }).eq('id', barberId);
  if (error) throw new Error(error.message);
  revalidatePath('/barbers');
  revalidatePath(`/barbers/${barberId}`);
}

export async function setUserBanned(userId: string, isBanned: boolean): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('profiles').update({ is_banned: isBanned }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/users');
}

export async function markPayoutPaid(payoutId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payoutId);
  if (error) throw new Error(error.message);
  revalidatePath('/payouts');
}

/** Computes each barber's gross earnings for the current week and upserts a pending payout row. */
export async function generateWeeklyPayouts(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // Fetch all barbers and their earnings in one query via a grouped select
  const [{ data: barbers }, { data: bookings }] = await Promise.all([
    supabase.from('barbers').select('id'),
    supabase
      .from('bookings')
      .select('barber_id, total_amount')
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString()),
  ]);

  if (!barbers?.length || !bookings?.length) {
    revalidatePath('/payouts');
    return;
  }

  // Sum earnings per barber
  const earningsByBarber = new Map<string, number>();
  for (const b of bookings) {
    earningsByBarber.set(b.barber_id, (earningsByBarber.get(b.barber_id) ?? 0) + Number(b.total_amount));
  }

  const payouts = barbers
    .map((barber) => {
      const gross = earningsByBarber.get(barber.id) ?? 0;
      if (gross <= 0) return null;
      const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
      const net = Math.round((gross - commission) * 100) / 100;
      return {
        barber_id: barber.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        gross_amount: gross,
        commission_amount: commission,
        net_amount: net,
      };
    })
    .filter(Boolean) as {
      barber_id: string;
      period_start: string;
      period_end: string;
      gross_amount: number;
      commission_amount: number;
      net_amount: number;
    }[];

  if (payouts.length > 0) {
    await supabase.from('payouts').upsert(payouts, { onConflict: 'barber_id,period_start,period_end' });
  }

  revalidatePath('/payouts');
}
