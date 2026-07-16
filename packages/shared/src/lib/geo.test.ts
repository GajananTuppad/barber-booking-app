import { describe, expect, it } from 'vitest';
import { haversineDistanceKm } from './geo';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946)).toBeCloseTo(0, 6);
  });

  it('computes the known distance between Bengaluru and Mysore (~123km)', () => {
    const distance = haversineDistanceKm(12.9716, 77.5946, 12.2958, 76.6394);
    expect(distance).toBeGreaterThan(120);
    expect(distance).toBeLessThan(130);
  });

  it('is symmetric regardless of point order', () => {
    const a = haversineDistanceKm(12.9716, 77.5946, 12.2958, 76.6394);
    const b = haversineDistanceKm(12.2958, 76.6394, 12.9716, 77.5946);
    expect(a).toBeCloseTo(b, 9);
  });
});
