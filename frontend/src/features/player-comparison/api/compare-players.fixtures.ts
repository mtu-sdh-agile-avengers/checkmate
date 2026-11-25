import type { PlayerComparisonDto } from '@/features/player-comparison/api/compare-players';

// Our API response for hikaru vs the sample player in rapid (values from the backend tests:
// real Chess.com stats of Hikaru, hand-written stats of "checkmate_tester").
export const HIKARU_VS_TESTER: PlayerComparisonDto = {
  timeClass: 'rapid',
  player1: {
    username: 'hikaru',
    dayPeriod: 'all',
    timeClass: 'rapid',
    wins: 205,
    losses: 69,
    draws: 220,
    rating: { current: 2838, highest: 2927, expected: null, change: null, difference: null },
    ratingHistory: [],
    totalGamesPlayed: 494,
    winRate: 0.415,
  },
  player2: {
    username: 'checkmate_tester',
    dayPeriod: 'all',
    timeClass: 'rapid',
    wins: 800,
    losses: 610,
    draws: 95,
    rating: { current: 2210, highest: 2275, expected: null, change: null, difference: null },
    ratingHistory: [],
    totalGamesPlayed: 1505,
    winRate: 0.5316,
  },
  winLikelihood: { player1: 0.9738, player2: 0.0262 },
  winner: 'hikaru',
};
