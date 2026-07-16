import { TRPCError } from '@trpc/server';
import type { z } from 'zod';
import { generateSlotsFromSchedule } from '../../lib/schedule';
import {
  createSlotsInputSchema,
  earningsPeriodSchema,
  getDailyEarningsInputSchema,
  getEarningsInputSchema,
  serviceIdInputSchema,
  slotIdInputSchema,
  updateProfileInputSchema,
} from '../../schemas';
import type { BarberUpdate, ServiceRow } from '../../types/database';
import { barberProcedure, router } from '../trpc';

const DAYS_AHEAD = 30;

function periodStart(period: Exclude<z.infer<typeof earningsPeriodSchema>, 'all'>): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const days = period === 'week' ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export const vendorRouter = router({
  getMyProfile: barberProcedure.query(async ({ ctx }) => {
    const [{ data: services, error: servicesError }, { data: salon, error: salonError }] = await Promise.all([
      ctx.supabase.from('services').select('*').eq('barber_id', ctx.barber.id).order('created_at', { ascending: true }),
      ctx.supabase.from('salons').select('*').eq('id', ctx.barber.salon_id).maybeSingle(),
    ]);
    if (servicesError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: servicesError.message });
    if (salonError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: salonError.message });

    return { barber: ctx.barber, salon: salon ?? null, services: services ?? [] };
  }),

  updateProfile: barberProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const barberUpdate: BarberUpdate = {};
      if (input.bio !== undefined) barberUpdate.bio = input.bio;
      if (input.avatarUrl !== undefined) barberUpdate.avatar_url = input.avatarUrl;
      if (input.coverImageUrl !== undefined) barberUpdate.cover_image_url = input.coverImageUrl;
      if (input.experienceYears !== undefined) barberUpdate.experience_years = input.experienceYears;
      if (input.isAvailable !== undefined) barberUpdate.is_available = input.isAvailable;

      let barber = ctx.barber;
      if (Object.keys(barberUpdate).length > 0) {
        const { data, error } = await ctx.supabase
          .from('barbers')
          .update(barberUpdate)
          .eq('id', ctx.barber.id)
          .select('*')
          .single();
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        barber = data;
      }

      let services: ServiceRow[] = [];
      if (input.services) {
        const toUpdate = input.services.filter(
          (service): service is typeof service & { id: string } => Boolean(service.id),
        );
        const toInsert = input.services.filter((service) => !service.id);

        const updated = await Promise.all(
          toUpdate.map(async (service) => {
            const { data, error } = await ctx.supabase
              .from('services')
              .update({
                name: service.name,
                description: service.description ?? null,
                duration_minutes: service.durationMinutes,
                price: service.price,
              })
              .eq('id', service.id)
              .eq('barber_id', ctx.barber.id)
              .select('*')
              .single();
            if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
            return data;
          }),
        );

        let inserted: ServiceRow[] = [];
        if (toInsert.length > 0) {
          const { data, error } = await ctx.supabase
            .from('services')
            .insert(
              toInsert.map((service) => ({
                barber_id: ctx.barber.id,
                name: service.name,
                description: service.description ?? null,
                duration_minutes: service.durationMinutes,
                price: service.price,
              })),
            )
            .select('*');
          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          inserted = data ?? [];
        }

        services = [...updated, ...inserted];
      }

      return { barber, services };
    }),

  createSlots: barberProcedure
    .input(createSlotsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const generated = generateSlotsFromSchedule(input.schedule, now, DAYS_AHEAD);
      if (generated.length === 0) return { created: 0 };

      const rangeEnd = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
      const { data: existingSlots, error: existingError } = await ctx.supabase
        .from('slots')
        .select('start_time')
        .eq('barber_id', ctx.barber.id)
        .gte('start_time', now.toISOString())
        .lt('start_time', rangeEnd.toISOString());
      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message });
      }

      const existingStartTimes = new Set((existingSlots ?? []).map((s) => new Date(s.start_time).getTime()));
      const toInsert = generated
        .filter((slot) => !existingStartTimes.has(slot.startTime.getTime()))
        .map((slot) => ({
          barber_id: ctx.barber.id,
          start_time: slot.startTime.toISOString(),
          end_time: slot.endTime.toISOString(),
          status: 'available' as const,
        }));

      if (toInsert.length === 0) return { created: 0 };

      const { error: insertError } = await ctx.supabase.from('slots').insert(toInsert);
      if (insertError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message });

      return { created: toInsert.length };
    }),

  deleteSlot: barberProcedure
    .input(slotIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: slot, error } = await ctx.supabase
        .from('slots')
        .select('*')
        .eq('id', input.slotId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!slot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Slot not found' });
      if (slot.barber_id !== ctx.barber.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this slot' });
      }
      if (new Date(slot.start_time) <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a slot that already started' });
      }
      if (slot.status === 'booked') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a slot with an active booking' });
      }

      const { error: updateError } = await ctx.supabase
        .from('slots')
        .update({ status: 'cancelled' })
        .eq('id', slot.id);
      if (updateError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });

      return { status: 'cancelled' as const };
    }),

  getEarnings: barberProcedure
    .input(getEarningsInputSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('bookings')
        .select('total_amount')
        .eq('barber_id', ctx.barber.id)
        .in('status', ['confirmed', 'completed']);

      if (input.period !== 'all') {
        query = query.gte('created_at', periodStart(input.period).toISOString());
      }

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const total = (data ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);
      return { period: input.period, bookingCount: data?.length ?? 0, total };
    }),

  getDailyEarnings: barberProcedure
    .input(getDailyEarningsInputSchema)
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const { data, error } = await ctx.supabase
        .from('bookings')
        .select('total_amount, created_at')
        .eq('barber_id', ctx.barber.id)
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', since.toISOString());
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const totalsByDay = new Map<string, number>();
      for (const row of data ?? []) {
        const day = row.created_at.slice(0, 10);
        totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + Number(row.total_amount));
      }

      return Array.from({ length: input.days }, (_, i) => {
        const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
        const day = date.toISOString().slice(0, 10);
        return { day, total: totalsByDay.get(day) ?? 0 };
      });
    }),

  deleteService: barberProcedure
    .input(serviceIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: service, error } = await ctx.supabase
        .from('services')
        .select('*')
        .eq('id', input.serviceId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!service) throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found' });
      if (service.barber_id !== ctx.barber.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this service' });
      }

      const { error: deleteError } = await ctx.supabase.from('services').delete().eq('id', service.id);
      if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });

      return { id: service.id };
    }),

  getPayouts: barberProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('payouts')
      .select('*')
      .eq('barber_id', ctx.barber.id)
      .order('period_start', { ascending: false });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),
});
