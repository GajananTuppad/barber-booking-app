import { barberRouter } from './router/barber';
import { bookingRouter } from './router/booking';
import { reviewRouter } from './router/review';
import { vendorRouter } from './router/vendor';
import { router } from './trpc';

export const appRouter = router({
  barber: barberRouter,
  booking: bookingRouter,
  review: reviewRouter,
  vendor: vendorRouter,
});

export type AppRouter = typeof appRouter;

export * from './context';
export * from './trpc';
