import type { PlayerSummaryDto } from '@/features/summary-statistics/api/get-summary';

// Our API response for hikaru, blitz, last day (values from the real Chess.com snapshot
// used by the backend tests: 7 blitz games on 31 Oct 2026)
export const HIKARU_BLITZ_SUMMARY: PlayerSummaryDto = {
  username: 'hikaru',
  dayPeriod: '1',
  timeClass: 'blitz',
  wins: 5,
  losses: 2,
  draws: 0,
  rating: { current: 3467, highest: 3503, expected: null, change: -30, difference: null },
  ratingHistory: [
    { date: '2026-10-31T19:11:46Z', rating: 3455 },
    { date: '2026-10-31T19:15:41Z', rating: 3444 },
    { date: '2026-10-31T19:19:14Z', rating: 3449 },
    { date: '2026-10-31T19:25:45Z', rating: 3454 },
    { date: '2026-10-31T19:29:21Z', rating: 3443 },
    { date: '2026-10-31T19:32:54Z', rating: 3448 },
    { date: '2026-10-31T19:39:20Z', rating: 3453 },
  ],
  totalGamesPlayed: 7,
  winRate: 0.7143,
};

export const NO_GAMES_SUMMARY: PlayerSummaryDto = {
  ...HIKARU_BLITZ_SUMMARY,
  dayPeriod: '30',
  wins: 0,
  losses: 0,
  draws: 0,
  rating: { current: 3467, highest: 3503, expected: null, change: null, difference: null },
  ratingHistory: [],
  totalGamesPlayed: 0,
  winRate: 0,
};
