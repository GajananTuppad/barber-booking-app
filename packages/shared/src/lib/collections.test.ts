import { describe, expect, it } from 'vitest';
import { groupBy, indexBy } from './collections';

describe('indexBy', () => {
  it('maps each item by its key', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ];
    const result = indexBy(items, (item) => item.id);
    expect(result.get('a')).toEqual({ id: 'a', value: 1 });
    expect(result.get('b')).toEqual({ id: 'b', value: 2 });
    expect(result.size).toBe(2);
  });

  it('keeps the last item when keys collide', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'a', value: 2 },
    ];
    const result = indexBy(items, (item) => item.id);
    expect(result.get('a')).toEqual({ id: 'a', value: 2 });
  });

  it('returns an empty map for an empty array', () => {
    expect(indexBy([], (item: { id: string }) => item.id).size).toBe(0);
  });
});

describe('groupBy', () => {
  it('buckets items by key, preserving order within each bucket', () => {
    const items = [
      { barberId: 'x', rating: 5 },
      { barberId: 'y', rating: 3 },
      { barberId: 'x', rating: 4 },
    ];
    const result = groupBy(items, (item) => item.barberId);
    expect(result.get('x')).toEqual([
      { barberId: 'x', rating: 5 },
      { barberId: 'x', rating: 4 },
    ]);
    expect(result.get('y')).toEqual([{ barberId: 'y', rating: 3 }]);
  });

  it('returns undefined for a key with no matching items', () => {
    const result = groupBy([{ k: 'a' }], (item) => item.k);
    expect(result.get('missing')).toBeUndefined();
  });
});
