import { describe, expect, it } from 'vitest';
import { betterSide, compareMetrics } from '@/utils/comparison';

describe('comparison', () => {
  it('prefers the higher value where higher is better', () => {
    expect(betterSide(2400, 2300, 'higher')).toBe('player1');
    expect(betterSide(2300, 2400, 'higher')).toBe('player2');
  });

  it('prefers the lower value where lower is better (losses)', () => {
    expect(betterSide(10, 20, 'lower')).toBe('player1');
    expect(betterSide(20, 10, 'lower')).toBe('player2');
  });

  it('highlights nothing for equal, missing or neutral values', () => {
    expect(betterSide(5, 5, 'higher')).toBeNull();
    expect(betterSide(null, 5, 'higher')).toBeNull();
    expect(betterSide(5, 1, null)).toBeNull();
  });

  it('builds one row per statistic in a fixed order', () => {
    const stats = {
      games: 10,
      wins: 5,
      draws: 2,
      losses: 3,
      winRate: 50,
      currentRating: 1500,
      highestRating: 1600,
    };

    const rows = compareMetrics(stats, { ...stats, losses: 4, currentRating: null });

    expect(rows.map((row) => row.key)).toEqual([
      'games',
      'wins',
      'draws',
      'losses',
      'winRate',
      'currentRating',
      'highestRating',
    ]);
    expect(rows.find((row) => row.key === 'losses')?.better).toBe('player1');
    expect(rows.find((row) => row.key === 'currentRating')?.better).toBeNull();
    expect(rows.filter((row) => row.better !== null)).toHaveLength(1);
  });
});
