import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockGetSummary } from '@/lib/mock-api';
import type { SummaryStats, TimeClass, TimeFrame } from '@/types/chess';
import { formatDay } from '@/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Response of GET /api/v1/players/{username}/summary (backend: PlayerStatisticSummaryResponse). */
export type PlayerSummaryDto = {
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
  ratingHistory: { date: string; rating: number }[]; // date: ISO date-time of the game's end (UTC)
  totalGamesPlayed: number;
  winRate: number; // 0..1
};

export async function getSummary(
  username: string,
  timeFrame: TimeFrame,
  timeClass: TimeClass,
): Promise<SummaryStats> {
  if (getApiMode() === 'mock') return mockGetSummary(username, timeFrame, timeClass);

  const dto = await apiGet<PlayerSummaryDto>(`/players/${encodeURIComponent(username)}/summary`, {
    period: timeFrame,
    timeClass,
  });
  return toSummaryStats(dto, timeFrame, timeClass);
}

/** Maps the API response to the shape the summary statistics page uses. */
export function toSummaryStats(
  dto: PlayerSummaryDto,
  timeFrame: TimeFrame,
  timeClass: TimeClass,
  now: Date = new Date(),
): SummaryStats {
  return {
    timeFrame,
    timeClass,
    from:
      timeFrame === 'all'
        ? 'All time'
        : formatDay(new Date(now.getTime() - Number(timeFrame) * DAY_MS)),
    to: formatDay(now),
    games: dto.totalGamesPlayed,
    wins: dto.wins,
    draws: dto.draws,
    losses: dto.losses,
    winRate: Math.round(dto.winRate * 100), // API: 0..1, page: whole percent
    expectedRating: dto.rating.expected,
    actualRating: dto.rating.current,
    difference: dto.rating.difference,
    lastChange: dto.rating.change,
    ratingHistory: dto.ratingHistory.map((point) => ({
      date: point.date.slice(0, 10), // chart works with calendar days
      rating: point.rating,
    })),
  };
}
