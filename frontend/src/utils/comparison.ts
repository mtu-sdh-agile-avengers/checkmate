import type { ComparisonMetric, ComparisonSide } from '@/types/chess';

/** All-time statistics of one player, as the comparison rows need them. */
export type ComparedStats = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // whole percent
  currentRating: number | null;
  highestRating: number | null;
};

type Rule = 'higher' | 'lower' | null; // which value is better; null = not a contest

const METRICS: { key: ComparisonMetric['key']; label: string; rule: Rule }[] = [
  { key: 'games', label: 'Games played', rule: 'higher' },
  { key: 'wins', label: 'Wins', rule: 'higher' },
  { key: 'draws', label: 'Draws', rule: null },
  { key: 'losses', label: 'Losses', rule: 'lower' },
  { key: 'winRate', label: 'Win rate', rule: 'higher' },
  { key: 'currentRating', label: 'Current rating', rule: 'higher' },
  { key: 'highestRating', label: 'Highest rating', rule: 'higher' },
];

/** Who is better for one value; null when equal, unknown or not a contest. */
export function betterSide(
  player1: number | null,
  player2: number | null,
  rule: Rule,
): ComparisonSide | null {
  if (rule === null || player1 === null || player2 === null || player1 === player2) return null;
  const firstIsHigher = player1 > player2;
  return firstIsHigher === (rule === 'higher') ? 'player1' : 'player2';
}

/**
 * The comparison table rows (CMG4-15): the better value is highlighted green and the other
 * one red. Higher is better for games, wins, win rate and ratings; lower for losses; draws
 * are not highlighted.
 */
export function compareMetrics(player1: ComparedStats, player2: ComparedStats): ComparisonMetric[] {
  return METRICS.map(({ key, label, rule }) => ({
    key,
    label,
    player1: player1[key],
    player2: player2[key],
    better: betterSide(player1[key], player2[key], rule),
  }));
}
