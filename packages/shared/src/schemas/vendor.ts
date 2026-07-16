import { z } from 'zod';

export const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const weeklyScheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm'),
  intervalMinutes: z.number().int().positive().max(240),
});

export const earningsPeriodSchema = z.enum(['today', 'week', 'month', 'all']);

export const updateProfileInputSchema = z.object({
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  isAvailable: z.boolean().optional(),
  services: z.array(serviceInputSchema).optional(),
});

export const createSlotsInputSchema = z.object({ schedule: z.array(weeklyScheduleEntrySchema).min(1) });

export const slotIdInputSchema = z.object({ slotId: z.string().uuid() });

export const getEarningsInputSchema = z.object({ period: earningsPeriodSchema });

export const getDailyEarningsInputSchema = z.object({ days: z.number().int().positive().max(90).default(30) });

export const serviceIdInputSchema = z.object({ serviceId: z.string().uuid() });
