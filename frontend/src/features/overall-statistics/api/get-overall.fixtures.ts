import type { OverallSummaryDto } from '@/features/overall-statistics/api/get-overall';

// Our API response for hikaru, blitz, all time (GET /players/hikaru/summary?period=all&timeClass=blitz):
// record and ratings from Chess.com's stats, no rating history for "all".
export const HIKARU_BLITZ_ALL_TIME: OverallSummaryDto = {
  username: 'hikaru',
  dayPeriod: 'all',
  timeClass: 'blitz',
  wins: 24518,
  losses: 3511,
  draws: 2981,
  rating: { current: 3467, highest: 3503, expected: null, change: null, difference: null },
  ratingHistory: [],
  totalGamesPlayed: 31010,
  winRate: 0.7907,
};

export const NEVER_PLAYED_DAILY: OverallSummaryDto = {
  ...HIKARU_BLITZ_ALL_TIME,
  timeClass: 'daily',
  wins: 0,
  losses: 0,
  draws: 0,
  rating: { current: null, highest: null, expected: null, change: null, difference: null },
  totalGamesPlayed: 0,
  winRate: 0,
};
