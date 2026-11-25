import { describe, expect, it } from 'vitest';
import { moveBetween, targetsFrom } from '@/features/play-computer/utils/moves';

describe('play-computer moves', () => {
  const legal = ['e2e3', 'e2e4', 'g1f3', 'g1h3', 'b7b8q', 'b7b8r', 'b7b8b', 'b7b8n'];

  it('lists where a piece can go', () => {
    expect(targetsFrom(legal, 'e2')).toEqual(['e3', 'e4']);
    expect(targetsFrom(legal, 'b7')).toEqual(['b8']); // one square for the four promotions
    expect(targetsFrom(legal, 'd2')).toEqual([]);
  });

  it('finds the move between two squares and promotes to a queen', () => {
    expect(moveBetween(legal, 'g1', 'f3')).toBe('g1f3');
    expect(moveBetween(legal, 'b7', 'b8')).toBe('b7b8q');
    expect(moveBetween(legal, 'e2', 'e5')).toBeNull();
  });
});
