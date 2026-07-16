export interface WeeklyScheduleEntry {
  /** 0 = Sunday ... 6 = Saturday, matching Date#getUTCDay(). */
  dayOfWeek: number;
  /** "HH:mm", 24-hour, interpreted in UTC. */
  startTime: string;
  /** "HH:mm", 24-hour, interpreted in UTC. */
  endTime: string;
  intervalMinutes: number;
}

export interface GeneratedSlot {
  startTime: Date;
  endTime: Date;
}

function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid time "${value}", expected HH:mm`);
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** Generates slots for each matching weekday across `days` calendar days starting from `from` (UTC). */
export function generateSlotsFromSchedule(
  schedule: WeeklyScheduleEntry[],
  from: Date,
  days: number,
): GeneratedSlot[] {
  const scheduleByDay = new Map<number, WeeklyScheduleEntry[]>();
  for (const entry of schedule) {
    const bucket = scheduleByDay.get(entry.dayOfWeek);
    if (bucket) bucket.push(entry);
    else scheduleByDay.set(entry.dayOfWeek, [entry]);
  }

  const slots: GeneratedSlot[] = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + dayOffset),
    );
    const entries = scheduleByDay.get(date.getUTCDay()) ?? [];

    for (const entry of entries) {
      const start = parseTimeOfDay(entry.startTime);
      const end = parseTimeOfDay(entry.endTime);
      const dayStartMinutes = start.hours * 60 + start.minutes;
      const dayEndMinutes = end.hours * 60 + end.minutes;

      for (
        let minutes = dayStartMinutes;
        minutes + entry.intervalMinutes <= dayEndMinutes;
        minutes += entry.intervalMinutes
      ) {
        const slotStart = new Date(date);
        slotStart.setUTCMinutes(minutes);
        const slotEnd = new Date(slotStart.getTime() + entry.intervalMinutes * 60 * 1000);
        slots.push({ startTime: slotStart, endTime: slotEnd });
      }
    }
  }

  return slots;
}
