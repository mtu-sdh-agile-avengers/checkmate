import { describe, expect, it, vi } from 'vitest';
import { HIKARU_BLITZ_ALL_TIME } from '@/features/overall-statistics/api/get-overall.fixtures';
import { getOverall, toOverallStats } from '@/features/overall-statistics/api/get-overall';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('overall-statistics api', () => {
  it('asks the summary endpoint for all time in the chosen time class (live)', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_BLITZ_ALL_TIME);

    const overall = await getOverall('hikaru', 'blitz');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/hikaru/summary?period=all&timeClass=blitz', expect.anything());
    expect(overall).toMatchObject({ timeClass: 'blitz', games: 31010, wins: 24518, winRate: 79, currentRating: 3467, peakRating: 3503 });
  });

  it('maps the all-time summary and leaves out what the API does not give', () => {
    const overall = toOverallStats(HIKARU_BLITZ_ALL_TIME, 'blitz', new Date('2026-11-18T12:00:00Z'));
    expect(overall).toEqual({
      timeClass: 'blitz',
      from: null,
      to: 'Nov 18, 2026',
      games: 31010,
      wins: 24518,
      draws: 2981,
      losses: 3511,
      winRate: 79,
      currentRating: 3467,
      peakRating: 3503,
      peakDate: null,
      averageOpponent: null,
      ratingHistory: [],
    });
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});
    const blitz = await getOverall('hikaru', 'blitz');
    const daily = await getOverall('hikaru', 'daily');
    expect(blitz.games).toBe(1240);
    expect(daily.games).toBeLessThan(blitz.games);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
