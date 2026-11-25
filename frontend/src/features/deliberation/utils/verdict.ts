import type { ComparisonMetric, ComparisonSide, PlayerComparison } from '@/types/chess';
import { formatNumber } from '@/utils/format';

/** One statistic for both players, ready to show, and which side is better at it. */
export type VerdictRow = {
  key: ComparisonMetric['key'];
  label: string;
  player1: string;
  player2: string;
  better: ComparisonSide | null;
};

/** A comparison told as Deliberation's verdict: who wins, by how much and why. */
export type Verdict = {
  /** The likely winner; null when it is too close to call (even, or no ratings to go on). */
  winner: ComparisonSide | null;
  names: Record<ComparisonSide, string>;
  headline: string; // "hikaru wins" or "Too close to call"
  /** Expected score of each player in percent, from their ratings; null without both ratings. */
  likelihood: { player1: number; player2: number } | null;
  /** Why: the statistics the winner is better at, best reasons first (at most three). */
  reasons: string[];
  /** One sentence for the screen and for screen readers. */
  summary: string;
  rows: VerdictRow[];
};

/** The order reasons are given in: the ratings say most about who wins, the counts least. */
const REASON_ORDER: ComparisonMetric['key'][] = ['currentRating', 'winRate', 'highestRating', 'wins', 'losses', 'games'];

/**
 * Reads the verdict out of a comparison (GET /players/compare, see player-comparison). The
 * winner is the API's: the player with the higher expected score from the two ratings (Elo).
 * The reasons come from the compared statistics, where the API marks the better side.
 */
export function readVerdict(comparison: PlayerComparison): Verdict {
  const names = { player1: comparison.player1, player2: comparison.player2 };
  const winner = winnerSide(comparison);
  const rows = comparison.metrics.map((metric) => ({
    key: metric.key,
    label: metric.label,
    player1: formatValue(metric.key, metric.player1),
    player2: formatValue(metric.key, metric.player2),
    better: metric.better,
  }));
  const { timeClass, winLikelihood: likelihood } = comparison;

  if (!winner) {
    return {
      winner,
      names,
      headline: 'Too close to call',
      likelihood,
      reasons: noWinnerReasons(comparison),
      summary: likelihood
        ? `${names.player1} and ${names.player2} are evenly matched in ${timeClass}.`
        : `There are not enough ${timeClass} ratings to call a winner between ${names.player1} and ${names.player2}.`,
      rows,
    };
  }

  const loser: ComparisonSide = winner === 'player1' ? 'player2' : 'player1';
  const reasons = REASON_ORDER.map((key) => comparison.metrics.find((metric) => metric.key === key))
    .filter((metric): metric is ComparisonMetric => metric?.better === winner)
    .slice(0, 3)
    .map((metric) => reason(metric, metric[winner], metric[loser]));
  const score = likelihood?.[winner];
  return {
    winner,
    names,
    headline: `${names[winner]} wins`,
    likelihood,
    reasons,
    summary:
      score === undefined
        ? `${names[winner]} comes out ahead of ${names[loser]} in ${timeClass}.`
        : `${names[winner]} is the favourite in ${timeClass}, with a ${score}% expected score against ${names[loser]}.`,
    rows,
  };
}

/** The API names the winner; match it to a side (usernames can differ in case). */
function winnerSide({ winner, player1, player2 }: PlayerComparison): ComparisonSide | null {
  const name = winner?.toLowerCase();
  if (!name) return null;
  if (name === player1.toLowerCase()) return 'player1';
  if (name === player2.toLowerCase()) return 'player2';
  return null;
}

/** One line on why the winner won, from a statistic they are better at. */
function reason(metric: ComparisonMetric, winner: number | null, loser: number | null): string {
  const w = winner ?? 0;
  const l = loser ?? 0;
  switch (metric.key) {
    case 'currentRating':
      return `Rated ${formatNumber(w - l)} points higher (${formatNumber(w)} vs ${formatNumber(l)})`;
    case 'highestRating':
      return `Peaked ${formatNumber(w - l)} points higher (${formatNumber(w)} vs ${formatNumber(l)})`;
    case 'winRate':
      return `Wins more often (${w}% vs ${l}%)`;
    case 'wins':
      return `More wins (${formatNumber(w)} vs ${formatNumber(l)})`;
    case 'losses':
      return `Fewer losses (${formatNumber(w)} vs ${formatNumber(l)})`;
    default:
      return `More games played (${formatNumber(w)} vs ${formatNumber(l)})`;
  }
}

/** Why there is no winner: a missing rating, or ratings that are level. */
function noWinnerReasons({ metrics, player1, player2, timeClass }: PlayerComparison): string[] {
  const rating = metrics.find((metric) => metric.key === 'currentRating');
  if (!rating) return [];
  const missing = [rating.player1 === null ? player1 : null, rating.player2 === null ? player2 : null].filter(Boolean);
  if (missing.length > 0) return missing.map((name) => `${name} has no ${timeClass} rating yet`);
  return [`Both are rated ${formatNumber(rating.player1 ?? 0)}`];
}

function formatValue(key: ComparisonMetric['key'], value: number | null): string {
  if (value === null) return '—';
  return key === 'winRate' ? `${value}%` : formatNumber(value);
}
