import { describe, expect, it } from 'vitest';
import type { PlayerComparison } from '@/types/chess';
import { compareMetrics, type ComparedStats } from '@/utils/comparison';
import { readVerdict } from './verdict';

const HIKARU: ComparedStats = { games: 1200, wins: 800, draws: 200, losses: 200, winRate: 67, currentRating: 2900, highestRating: 2950 };
const MAGNUS: ComparedStats = { games: 1500, wins: 900, draws: 300, losses: 300, winRate: 60, currentRating: 2836, highestRating: 2990 };

const comparison = (overrides: Partial<PlayerComparison> = {}, player2: ComparedStats = MAGNUS): PlayerComparison => ({
  timeClass: 'rapid',
  player1: 'hikaru',
  player2: 'magnuscarlsen',
  metrics: compareMetrics(HIKARU, player2),
  winLikelihood: { player1: 59.1, player2: 40.9 },
  winner: 'Hikaru', // the API may spell a name with capitals
  ...overrides,
});

describe('verdict', () => {
  it('names the winner and gives the statistics they are better at, best reasons first', () => {
    const verdict = readVerdict(comparison());
    expect(verdict.winner).toBe('player1');
    expect(verdict.headline).toBe('hikaru wins');
    expect(verdict.summary).toBe('hikaru is the favourite in rapid, with a 59.1% expected score against magnuscarlsen.');
    // Better rating, win rate and fewer losses; not the peak rating, wins or games, which magnuscarlsen has.
    expect(verdict.reasons).toEqual(['Rated 64 points higher (2,900 vs 2,836)', 'Wins more often (67% vs 60%)', 'Fewer losses (200 vs 300)']);
  });

  it('lays out every statistic for both players, marking the better one', () => {
    const rows = readVerdict(comparison()).rows;
    expect(rows.find((row) => row.key === 'winRate')).toEqual({ key: 'winRate', label: 'Win rate', player1: '67%', player2: '60%', better: 'player1' });
    expect(rows.find((row) => row.key === 'highestRating')?.better).toBe('player2');
    expect(rows.find((row) => row.key === 'draws')?.better).toBeNull();
  });

  it('calls it too close when the API names no winner', () => {
    const even = readVerdict(comparison({ winner: null, winLikelihood: { player1: 50, player2: 50 } }, { ...MAGNUS, currentRating: 2900 }));
    expect(even.winner).toBeNull();
    expect(even.headline).toBe('Too close to call');
    expect(even.summary).toBe('hikaru and magnuscarlsen are evenly matched in rapid.');
    expect(even.reasons).toEqual(['Both are rated 2,900']);

    const unrated = readVerdict(comparison({ winner: null, winLikelihood: null }, { ...MAGNUS, currentRating: null }));
    expect(unrated.summary).toBe('There are not enough rapid ratings to call a winner between hikaru and magnuscarlsen.');
    expect(unrated.reasons).toEqual(['magnuscarlsen has no rapid rating yet']);
    expect(unrated.rows.find((row) => row.key === 'currentRating')?.player2).toBe('—');
  });
});
