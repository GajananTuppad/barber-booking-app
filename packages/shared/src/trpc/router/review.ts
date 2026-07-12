import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { indexBy } from '../../lib/collections';
import { protectedProcedure, publicProcedure, router } from '../trpc';

export const reviewRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: booking, error: bookingError } = await ctx.supabase
        .from('bookings')
        .select('*')
        .eq('id', input.bookingId)
        .maybeSingle();
      if (bookingError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: bookingError.message });
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      if (booking.customer_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this booking' });
      }
      if (booking.status === 'pending' || booking.status === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only review a confirmed or completed booking',
        });
      }

      const { data: existingReview, error: existingReviewError } = await ctx.supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .maybeSingle();
      if (existingReviewError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingReviewError.message });
      }
      if (existingReview) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking already has a review' });
      }

      const { data: review, error } = await ctx.supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          barber_id: booking.barber_id,
          rating: input.rating,
          comment: input.comment ?? null,
        })
        .select('*')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return review;
    }),

  getByBarber: publicProcedure
    .input(z.object({ barberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: reviews, error } = await ctx.supabase
        .from('reviews')
        .select('*')
        .eq('barber_id', input.barberId)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!reviews || reviews.length === 0) return [];

      const customerIds = [...new Set(reviews.map((r) => r.customer_id))];
      const { data: customers, error: customersError } = await ctx.supabase
        .from('profiles')
        .select('*')
        .in('id', customerIds);
      if (customersError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: customersError.message });
      }

      const customersById = indexBy(customers ?? [], (p) => p.id);
      return reviews.map((review) => ({
        ...review,
        customer: customersById.get(review.customer_id) ?? null,
      }));
    }),
});
