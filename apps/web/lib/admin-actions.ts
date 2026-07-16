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

  const { data: barbers } = await supabase.from('barbers').select('id');

  for (const barber of barbers ?? []) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('barber_id', barber.id)
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    const gross = (bookings ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0);
    if (gross <= 0) continue;

    const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
    const net = Math.round((gross - commission) * 100) / 100;

    await supabase.from('payouts').upsert(
      {
        barber_id: barber.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        gross_amount: gross,
        commission_amount: commission,
        net_amount: net,
      },
      { onConflict: 'barber_id,period_start,period_end' },
    );
  }

  revalidatePath('/payouts');
}
