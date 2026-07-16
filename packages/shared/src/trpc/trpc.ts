import { TRPCError, initTRPC } from '@trpc/server';
import type { BarberRow } from '../types/database';
import type { TRPCContext } from './context';

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

/** Requires a signed-in user. Narrows `ctx.userId` to `string`. */
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/** Requires the signed-in user to have a barber row. Attaches it as `ctx.barber`. */
const isBarber = middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }

  const { data: barber, error } = await ctx.supabase
    .from('barbers')
    .select('*')
    .eq('profile_id', ctx.userId)
    .maybeSingle();

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!barber) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'A barber profile is required' });
  }

  return next({ ctx: { ...ctx, userId: ctx.userId, barber: barber as BarberRow } });
});

export const barberProcedure = t.procedure.use(isBarber);
