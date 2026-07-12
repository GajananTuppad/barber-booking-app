import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { indexBy } from '../../lib/collections';
import { callEdgeFunction } from '../../lib/edge-functions';
import type { TypedSupabaseClient } from '../../lib/supabase';
import type { BookingRow } from '../../types/database';
import { barberProcedure, protectedProcedure, router } from '../trpc';

async function enrichBookings(supabase: TypedSupabaseClient, bookings: BookingRow[]) {
  if (bookings.length === 0) return [];

  const slotIds = [...new Set(bookings.map((b) => b.slot_id))];
  const serviceIds = [...new Set(bookings.map((b) => b.service_id))];
  const barberIds = [...new Set(bookings.map((b) => b.barber_id))];
  const customerIds = [...new Set(bookings.map((b) => b.customer_id))];

  const [
    { data: slots, error: slotsError },
    { data: services, error: servicesError },
    { data: barbers, error: barbersError },
    { data: customers, error: customersError },
  ] = await Promise.all([
    supabase.from('slots').select('*').in('id', slotIds),
    supabase.from('services').select('*').in('id', serviceIds),
    supabase.from('barbers').select('*').in('id', barberIds),
    supabase.from('profiles').select('*').in('id', customerIds),
  ]);
  if (slotsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: slotsError.message });
  if (servicesError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: servicesError.message });
  if (barbersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: barbersError.message });
  if (customersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: customersError.message });

  const barberProfileIds = [...new Set((barbers ?? []).map((b) => b.profile_id))];
  const salonIds = [...new Set((barbers ?? []).map((b) => b.salon_id))];

  const [{ data: barberProfiles, error: barberProfilesError }, { data: salons, error: salonsError }] =
    await Promise.all([
      supabase.from('profiles').select('*').in('id', barberProfileIds),
      supabase.from('salons').select('*').in('id', salonIds),
    ]);
  if (barberProfilesError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: barberProfilesError.message });
  }
  if (salonsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: salonsError.message });

  const slotsById = indexBy(slots ?? [], (s) => s.id);
  const servicesById = indexBy(services ?? [], (s) => s.id);
  const barbersById = indexBy(barbers ?? [], (b) => b.id);
  const customersById = indexBy(customers ?? [], (p) => p.id);
  const barberProfilesById = indexBy(barberProfiles ?? [], (p) => p.id);
  const salonsById = indexBy(salons ?? [], (s) => s.id);

  return bookings.map((booking) => {
    const barber = barbersById.get(booking.barber_id) ?? null;
    return {
      ...booking,
      slot: slotsById.get(booking.slot_id) ?? null,
      service: servicesById.get(booking.service_id) ?? null,
      barber: barber
        ? {
            ...barber,
            profile: barberProfilesById.get(barber.profile_id) ?? null,
            salon: salonsById.get(barber.salon_id) ?? null,
          }
        : null,
      customer: customersById.get(booking.customer_id) ?? null,
    };
  });
}

export const bookingRouter = router({
  getMyBookings: protectedProcedure.query(async ({ ctx }) => {
    const { data: bookings, error } = await ctx.supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', ctx.userId)
      .order('created_at', { ascending: false });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    return enrichBookings(ctx.supabase, bookings ?? []);
  }),

  getBarberBookings: barberProcedure.query(async ({ ctx }) => {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const { data: bookings, error } = await ctx.supabase
      .from('bookings')
      .select('*')
      .eq('barber_id', ctx.barber.id)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    const enriched = await enrichBookings(ctx.supabase, bookings ?? []);
    return enriched.filter((booking) => booking.slot && new Date(booking.slot.start_time) >= startOfToday);
  }),

  getById: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: booking, error } = await ctx.supabase
        .from('bookings')
        .select('*')
        .eq('id', input.bookingId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

      const isCustomer = booking.customer_id === ctx.userId;
      let isOwningBarber = false;
      if (!isCustomer) {
        const { data: barber } = await ctx.supabase
          .from('barbers')
          .select('id')
          .eq('profile_id', ctx.userId)
          .maybeSingle();
        isOwningBarber = barber?.id === booking.barber_id;
      }
      if (!isCustomer && !isOwningBarber) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this booking' });
      }

      const [enriched] = await enrichBookings(ctx.supabase, [booking]);
      return enriched;
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: booking, error } = await ctx.supabase
        .from('bookings')
        .select('*')
        .eq('id', input.bookingId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      if (booking.customer_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this booking' });
      }
      if (booking.status === 'cancelled') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is already cancelled' });
      }
      if (booking.status === 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a completed booking' });
      }

      const { error: bookingUpdateError } = await ctx.supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
      if (bookingUpdateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: bookingUpdateError.message });
      }

      const { error: slotUpdateError } = await ctx.supabase
        .from('slots')
        .update({ status: 'available' })
        .eq('id', booking.slot_id);
      if (slotUpdateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: slotUpdateError.message });
      }

      // The cancel-booking edge function owns the refund-eligibility check
      // (bookings cancelled within 1 hour of creation) and the cancellation
      // notification. The DB state above is already consistent even if this
      // call fails, so we don't roll back on error — we just surface it.
      let refunded = false;
      try {
        const { data: sessionData } = await ctx.supabase.auth.getSession();
        const result = await callEdgeFunction<{ status: string; refunded: boolean }>(
          'cancel-booking',
          { bookingId: booking.id },
          sessionData.session?.access_token,
        );
        refunded = result.refunded;
      } catch (err) {
        console.error('cancel-booking edge function call failed', err);
      }

      return { status: 'cancelled' as const, refunded };
    }),
});
