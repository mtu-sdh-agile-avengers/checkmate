import { MOCK_DELAY_MS } from '@/config/constants';
import type { OverallStats, Player, RatingPoint, SummaryStats, TimeClass, TimeFrame } from '@/types/chess';

// Mock repository: all figures are fictional design fixtures, NOT live Chess.com records.
const currentUtc = 1793743200; // 2026-11-03 UTC; fixed for reproducible screenshots.
const historyOffsets = [0, 4, 6, 5, 10, 13, 11, 16, 19, 17, 21, 24, 27, 25, 31, 34, 33, 38, 41, 44, 42, 48, 52, 50, 56];

async function mockDelay(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function ensureAvailable(username: string): void {
  if (username === 'notfound') throw new Error('This profile is not in the demo data. Try hikaru.');
  if (username === 'error') throw new Error('Demo service unavailable. Please retry.');
}

function makeHistory(endRating: number, frame: TimeFrame): RatingPoint[] {
  const total = frame === '7' ? 7 : frame === '15' ? 15 : frame === '30' ? 30 : 24;
  const start = frame === 'all' ? new Date('2023-01-12T12:00:00Z') : new Date('2026-11-03T12:00:00Z');
  if (frame !== 'all') start.setUTCDate(start.getUTCDate() - (total - 1));
  const spread = frame === 'all' ? 310 : 85;
  const endingWave = historyOffsets[(total - 1) % historyOffsets.length] ?? 0;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start);
    if (frame === 'all') date.setUTCMonth(date.getUTCMonth() + i * 2);
    else date.setUTCDate(date.getUTCDate() + i);
    const offset = historyOffsets[i % historyOffsets.length] ?? 0;
    const fraction = i / Math.max(1, total - 1);
    const trend = endRating - spread + spread * fraction;
    return { date: date.toISOString().slice(0, 10), rating: Math.round(trend + offset - endingWave * fraction) };
  });
}

export async function mockFindPlayer(username: string): Promise<Player> {
  await mockDelay();
  ensureAvailable(username);
  return {
    id: '1029387',
    username,
    url: `https://www.chess.com/member/${encodeURIComponent(username)}`,
    avatar: null,
    title: username === 'hikaru' ? 'GM' : null,
    location: username === 'hikaru' ? 'Los Angeles, CA' : null,
    country: username === 'hikaru' ? 'United States (US)' : null,
    joined: 1263556800,
    lastOnline: 1793284200,
    followers: username === 'hikaru' ? 1245678 : 0,
    isStreamer: username === 'hikaru',
    twitchUrl: username === 'hikaru' ? 'https://www.twitch.tv/gmhikaru' : null,
    fide: username === 'hikaru' ? 2780 : null,
  };
}

export async function mockGetSummary(
  username: string,
  frame: TimeFrame,
  timeClass: TimeClass,
): Promise<SummaryStats> {
  await mockDelay();
  ensureAvailable(username);
  const frameScale: Record<TimeFrame, number> = { '7': 0.26, '15': 0.52, '30': 1, all: 10.6 };
  const classScale: Record<TimeClass, number> = { bullet: 1.25, blitz: 1, rapid: 0.78, daily: 0.18 };
  const games = Math.max(2, Math.round(60 * frameScale[frame] * classScale[timeClass]));
  const wins = Math.round(games * 0.55);
  const draws = Math.round(games * 0.1);
  const losses = games - wins - draws;
  const classOffset: Record<TimeClass, number> = { bullet: -70, blitz: 0, rapid: 35, daily: -120 };
  const actualRating = 1486 + classOffset[timeClass] + (frame === '7' ? -10 : frame === '15' ? -6 : 0);
  const expectedRating = actualRating - 14;
  return {
    timeFrame: frame,
    timeClass,
    from: frame === 'all' ? 'Jan 12, 2023' : frame === '30' ? 'Oct 5, 2026' : frame === '15' ? 'Oct 20, 2026' : 'Oct 28, 2026',
    to: 'Nov 3, 2026',
    games,
    wins,
    draws,
    losses,
    winRate: Math.round((wins / games) * 100),
    expectedRating,
    actualRating,
    difference: actualRating - expectedRating,
    lastChange: 8,
    ratingHistory: makeHistory(actualRating, frame),
  };
}

export async function mockGetOverall(username: string): Promise<OverallStats> {
  await mockDelay();
  ensureAvailable(username);
  return {
    from: 'Jan 12, 2023',
    to: 'Nov 3, 2026',
    games: 1240,
    wins: 682,
    draws: 134,
    losses: 424,
    winRate: 55,
    peakRating: 1562,
    peakDate: 'Oct 28, 2026',
    averageOpponent: 1428,
    ratingHistory: makeHistory(1548, 'all'),
  };
}

// Static browser fixtures make it easy to replace the mock with a real API client later.
export const mockMetadata = { sample: true, asOf: currentUtc } as const;
