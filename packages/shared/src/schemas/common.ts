import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const barberIdInputSchema = z.object({ barberId: uuidSchema });
export const bookingIdInputSchema = z.object({ bookingId: uuidSchema });
