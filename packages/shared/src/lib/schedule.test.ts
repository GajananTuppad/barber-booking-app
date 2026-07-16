import { describe, expect, it } from 'vitest';
import { generateSlotsFromSchedule } from './schedule';

// 2024-01-01T00:00:00Z is a Monday (UTC day 1).
const MONDAY = new Date(Date.UTC(2024, 0, 1));

describe('generateSlotsFromSchedule', () => {
  it('generates slots only on matching weekdays, spaced by the interval', () => {
    const slots = generateSlotsFromSchedule(
      [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00', intervalMinutes: 30 }],
      MONDAY,
      7,
    );

    expect(slots).toHaveLength(2);
    expect(slots[0]?.startTime.toISOString()).toBe('2024-01-01T09:00:00.000Z');
    expect(slots[0]?.endTime.toISOString()).toBe('2024-01-01T09:30:00.000Z');
    expect(slots[1]?.startTime.toISOString()).toBe('2024-01-01T09:30:00.000Z');
    expect(slots[1]?.endTime.toISOString()).toBe('2024-01-01T10:00:00.000Z');
  });

  it('does not generate a trailing slot that would run past the end time', () => {
    // 09:00-10:00 with a 40-minute interval fits exactly one slot (09:00-09:40);
    // a second would end at 10:20, past the 10:00 boundary.
    const slots = generateSlotsFromSchedule(
      [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00', intervalMinutes: 40 }],
      MONDAY,
      1,
    );
    expect(slots).toHaveLength(1);
  });

  it('repeats across every matching weekday in the range', () => {
    const slots = generateSlotsFromSchedule(
      [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:30', intervalMinutes: 30 }],
      MONDAY,
      14,
    );
    // Two Mondays fall within a 14-day window starting on a Monday.
    expect(slots).toHaveLength(2);
    expect(slots[1]?.startTime.toISOString()).toBe('2024-01-08T09:00:00.000Z');
  });

  it('returns no slots for a day of week that never occurs in range', () => {
    const slots = generateSlotsFromSchedule(
      [{ dayOfWeek: 3, startTime: '09:00', endTime: '10:00', intervalMinutes: 30 }],
      MONDAY,
      1,
    );
    expect(slots).toHaveLength(0);
  });
});
