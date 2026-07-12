import { jsonResponse } from '../_shared/cors.ts';
import { sendBookingReminder } from '../_shared/notifications.ts';
import { createAdminClient } from '../_shared/supabase-admin.ts';

const REMINDER_WINDOW_MS = 75 * 60 * 1000;

/** Invoked every 15 minutes by pg_cron (see supabase/migrations/004_cron.sql). */
Deno.serve(async (_req) => {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const windowEnd = new Date(Date.now() + REMINDER_WINDOW_MS).toISOString();

  const { data: bookings, error } = await admin
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false);
  if (error) return jsonResponse({ error: error.message }, 500);

  const due: { booking: NonNullable<typeof bookings>[number]; slot: Record<string, unknown> }[] = [];
  for (const booking of bookings ?? []) {
    const { data: slot } = await admin.from('slots').select('*').eq('id', booking.slot_id).maybeSingle();
    if (slot && slot.start_time >= now && slot.start_time <= windowEnd) {
      due.push({ booking, slot });
    }
  }

  let sent = 0;
  for (const { booking, slot } of due) {
    try {
      const [{ data: service }, { data: barber }, { data: customerProfile }, authUser] = await Promise.all([
        admin.from('services').select('*').eq('id', booking.service_id).maybeSingle(),
        admin.from('barbers').select('*').eq('id', booking.barber_id).maybeSingle(),
        admin.from('profiles').select('*').eq('id', booking.customer_id).maybeSingle(),
        admin.auth.admin.getUserById(booking.customer_id),
      ]);

      let barberName = 'your barber';
      let salonName = 'the salon';
      let salonAddress: string | null = null;
      if (barber) {
        const [{ data: barberProfile }, { data: salon }] = await Promise.all([
          admin.from('profiles').select('*').eq('id', barber.profile_id).maybeSingle(),
          admin.from('salons').select('*').eq('id', barber.salon_id).maybeSingle(),
        ]);
        barberName = barberProfile?.full_name ?? barberName;
        salonName = salon?.name ?? salonName;
        salonAddress = salon?.address ?? null;
      }

      await sendBookingReminder({
        bookingId: booking.id,
        startTime: String(slot.start_time),
        serviceName: service?.name ?? 'your appointment',
        barberName,
        salonName,
        salonAddress,
        customerName: customerProfile?.full_name ?? 'there',
        customerEmail: authUser.data.user?.email ?? null,
        customerPhone: customerProfile?.phone ?? null,
      });

      await admin.from('bookings').update({ reminder_sent: true }).eq('id', booking.id);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for booking ${booking.id}`, err);
    }
  }

  return jsonResponse({ checked: bookings?.length ?? 0, sent });
});
