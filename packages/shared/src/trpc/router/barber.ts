import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { groupBy, indexBy } from '../../lib/collections';
import { haversineDistanceKm } from '../../lib/geo';
import type { ReviewRow } from '../../types/database';
import { publicProcedure, router } from '../trpc';

function averageRating(reviews: Pick<ReviewRow, 'rating'>[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export const barberRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const { data: barbers, error: barbersError } = await ctx.supabase
      .from('barbers')
      .select('*')
      .eq('is_available', true);
    if (barbersError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: barbersError.message });
    }
    if (!barbers || barbers.length === 0) return [];

    const salonIds = [...new Set(barbers.map((b) => b.salon_id))];
    const profileIds = [...new Set(barbers.map((b) => b.profile_id))];
    const barberIds = barbers.map((b) => b.id);

    const [
      { data: salons, error: salonsError },
      { data: reviews, error: reviewsError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      ctx.supabase.from('salons').select('*').in('id', salonIds),
      ctx.supabase.from('reviews').select('barber_id, rating').in('barber_id', barberIds),
      ctx.supabase.from('profiles').select('*').in('id', profileIds),
    ]);
    if (salonsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: salonsError.message });
    }
    if (reviewsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reviewsError.message });
    }
    if (profilesError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profilesError.message });
    }

    const salonsById = indexBy(salons ?? [], (s) => s.id);
    const profilesById = indexBy(profiles ?? [], (p) => p.id);
    const reviewsByBarber = groupBy(reviews ?? [], (r) => r.barber_id);

    return barbers.map((barber) => {
      const barberReviews = reviewsByBarber.get(barber.id) ?? [];
      return {
        ...barber,
        profile: profilesById.get(barber.profile_id) ?? null,
        salon: salonsById.get(barber.salon_id) ?? null,
        avgRating: averageRating(barberReviews),
        reviewCount: barberReviews.length,
      };
    });
  }),

  getById: publicProcedure
    .input(z.object({ barberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: barber, error: barberError } = await ctx.supabase
        .from('barbers')
        .select('*')
        .eq('id', input.barberId)
        .maybeSingle();
      if (barberError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: barberError.message });
      }
      if (!barber) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Barber not found' });
      }

      const [
        { data: profile, error: profileError },
        { data: salon, error: salonError },
        { data: services, error: servicesError },
        { data: reviews, error: reviewsError },
        { data: upcomingSlots, error: slotsError },
      ] = await Promise.all([
        ctx.supabase.from('profiles').select('*').eq('id', barber.profile_id).maybeSingle(),
        ctx.supabase.from('salons').select('*').eq('id', barber.salon_id).maybeSingle(),
        ctx.supabase.from('services').select('*').eq('barber_id', barber.id),
        ctx.supabase
          .from('reviews')
          .select('*')
          .eq('barber_id', barber.id)
          .order('created_at', { ascending: false }),
        ctx.supabase
          .from('slots')
          .select('*')
          .eq('barber_id', barber.id)
          .eq('status', 'available')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(20),
      ]);

      if (profileError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profileError.message });
      }
      if (salonError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: salonError.message });
      }
      if (servicesError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: servicesError.message });
      }
      if (reviewsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reviewsError.message });
      }
      if (slotsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: slotsError.message });
      }

      const reviewerIds = [...new Set((reviews ?? []).map((review) => review.customer_id))];
      const { data: reviewers, error: reviewersError } = await ctx.supabase
        .from('profiles')
        .select('*')
        .in('id', reviewerIds);
      if (reviewersError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reviewersError.message });
      }
      const reviewersById = indexBy(reviewers ?? [], (p) => p.id);

      return {
        ...barber,
        profile: profile ?? null,
        salon: salon ?? null,
        services: services ?? [],
        reviews: (reviews ?? []).map((review) => ({
          ...review,
          customer: reviewersById.get(review.customer_id) ?? null,
        })),
        avgRating: averageRating(reviews ?? []),
        reviewCount: reviews?.length ?? 0,
        upcomingSlots: upcomingSlots ?? [],
      };
    }),

  getNearby: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusKm: z.number().positive().max(500).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data: salons, error: salonsError } = await ctx.supabase
        .from('salons')
        .select('*')
        .eq('is_active', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      if (salonsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: salonsError.message });
      }

      const nearbySalons = (salons ?? [])
        .map((salon) => ({
          salon,
          distanceKm: haversineDistanceKm(input.lat, input.lng, salon.lat as number, salon.lng as number),
        }))
        .filter(({ distanceKm }) => distanceKm <= input.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      if (nearbySalons.length === 0) return [];

      const salonIds = nearbySalons.map(({ salon }) => salon.id);
      const { data: barbers, error: barbersError } = await ctx.supabase
        .from('barbers')
        .select('*')
        .in('salon_id', salonIds)
        .eq('is_available', true);
      if (barbersError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: barbersError.message });
      }

      const profileIds = [...new Set((barbers ?? []).map((b) => b.profile_id))];
      const { data: profiles, error: profilesError } = await ctx.supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);
      if (profilesError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profilesError.message });
      }

      const distanceBySalon = new Map(nearbySalons.map(({ salon, distanceKm }) => [salon.id, distanceKm]));
      const salonById = indexBy(
        nearbySalons.map(({ salon }) => salon),
        (s) => s.id,
      );
      const profilesById = indexBy(profiles ?? [], (p) => p.id);

      return (barbers ?? [])
        .map((barber) => ({
          ...barber,
          profile: profilesById.get(barber.profile_id) ?? null,
          salon: salonById.get(barber.salon_id) ?? null,
          distanceKm: distanceBySalon.get(barber.salon_id) ?? null,
        }))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }),

  getSlots: publicProcedure
    .input(
      z.object({
        barberId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(`${input.date}T00:00:00.000Z`);
      if (Number.isNaN(dayStart.getTime())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid date' });
      }
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await ctx.supabase
        .from('slots')
        .select('*')
        .eq('barber_id', input.barberId)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString())
        .order('start_time', { ascending: true });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),
});
