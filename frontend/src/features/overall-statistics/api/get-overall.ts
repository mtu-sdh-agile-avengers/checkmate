import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockGetOverall } from '@/lib/mock-api';
import type { OverallStats, TimeClass } from '@/types/chess';
import { formatDay } from '@/utils/format';

/** Response of GET /api/v1/players/{username}/summary?period=all (backend: PlayerStatisticSummaryResponse). */
export type OverallSummaryDto = {
  username: string;
  dayPeriod: string;
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
  ratingHistory: { date: string; rating: number }[]; // empty for period=all
  totalGamesPlayed: number;
  winRate: number; // 0..1
};

/**
 * All-time statistics in one time class. Live, this is the summary endpoint with `period=all`:
 * the player's all-time record and current / highest rating from Chess.com's stats.
 */
export async function getOverall(username: string, timeClass: TimeClass): Promise<OverallStats> {
  if (getApiMode() === 'mock') return mockGetOverall(username, timeClass);

  const dto = await apiGet<OverallSummaryDto>(`/players/${encodeURIComponent(username)}/summary`, {
    period: 'all',
    timeClass,
  });
  return toOverallStats(dto, timeClass);
}

/** Maps the API response to the shape the overall statistics page uses. */
export function toOverallStats(dto: OverallSummaryDto, timeClass: TimeClass, now: Date = new Date()): OverallStats {
  return {
    timeClass,
    from: null, // the record covers the whole account
    to: formatDay(now),
    games: dto.totalGamesPlayed,
    wins: dto.wins,
    draws: dto.draws,
    losses: dto.losses,
    winRate: Math.round(dto.winRate * 100), // API: 0..1, page: whole percent
    currentRating: dto.rating.current,
    peakRating: dto.rating.highest,
    peakDate: null, // not in the API response (yet)
    averageOpponent: null, // not in the API response (yet)
    ratingHistory: dto.ratingHistory.map((point) => ({ date: point.date.slice(0, 10), rating: point.rating })),
  };
}
