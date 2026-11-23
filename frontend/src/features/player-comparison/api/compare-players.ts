import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockComparePlayers } from '@/lib/mock-api';
import type { PlayerComparison, TimeClass } from '@/types/chess';
import { compareMetrics, type ComparedStats } from '@/utils/comparison';
import { parseChessUsername } from '@/utils/username';

/** All-time summary of one player (backend: PlayerStatisticSummaryResponse, period=all). */
type ComparedPlayerDto = {
  username: string;
  dayPeriod: string; // "all"
  timeClass: TimeClass;
  wins: number;
  losses: number;
  draws: number;
  rating: {
    current: number | null;
    highest: number | null;
    expected: number | null;
    change: number | null;
    difference: number | null;
  };
  ratingHistory: { date: string; rating: number }[]; // empty for all-time statistics
  totalGamesPlayed: number;
  winRate: number; // 0..1
};

/** Response of GET /api/v1/players/compare (backend: PlayerComparisonResponse). */
export type PlayerComparisonDto = {
  timeClass: TimeClass;
  player1: ComparedPlayerDto;
  player2: ComparedPlayerDto;
  winLikelihood: { player1: number; player2: number } | null; // 0..1 each
  winner: string | null;
};

/**
 * Compares two players in one time class (CMG4-15): their all-time statistics side by side
 * and the estimated win likelihood.
 *
 * Both inputs are usernames or member profile links and are checked here first, so an
 * invalid one never reaches the API.
 * @throws Error / ApiError with a message to show, e.g. 404 "Players a, b data is unavailable"
 */
export async function comparePlayers(
  input1: string,
  input2: string,
  timeClass: TimeClass,
): Promise<PlayerComparison> {
  const [p1, p2] = [checkPlayer(input1, 1), checkPlayer(input2, 2)];
  if (p1 === p2) throw new Error('Choose two different players to compare.');

  if (getApiMode() === 'mock') return mockComparePlayers(p1, p2, timeClass);

  const dto = await apiGet<PlayerComparisonDto>('/players/compare', { p1, p2, timeClass });
  return toComparison(dto);
}

/** Maps the API response to the shape the comparison page uses. */
export function toComparison(dto: PlayerComparisonDto): PlayerComparison {
  const likelihood = dto.winLikelihood;
  return {
    timeClass: dto.timeClass,
    player1: dto.player1.username,
    player2: dto.player2.username,
    metrics: compareMetrics(toComparedStats(dto.player1), toComparedStats(dto.player2)),
    winLikelihood: likelihood
      ? { player1: toPercent(likelihood.player1), player2: toPercent(likelihood.player2) }
      : null,
    winner: dto.winner,
  };
}

function toComparedStats(player: ComparedPlayerDto): ComparedStats {
  return {
    games: player.totalGamesPlayed,
    wins: player.wins,
    draws: player.draws,
    losses: player.losses,
    winRate: Math.round(player.winRate * 100), // API: 0..1, page: whole percent
    currentRating: player.rating.current,
    highestRating: player.rating.highest,
  };
}

/** 0.5911 -> 59.1 (percent with one decimal) */
const toPercent = (value: number) => Math.round(value * 1000) / 10;

function checkPlayer(input: string, number: 1 | 2): string {
  try {
    return parseChessUsername(input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Check the username.';
    throw new Error(`Player ${number}: ${message}`);
  }
}
