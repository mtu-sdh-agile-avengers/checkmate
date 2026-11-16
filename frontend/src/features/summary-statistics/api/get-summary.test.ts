import { describe, expect, it, vi } from 'vitest';
import { getSummary, toSummaryStats } from '@/features/summary-statistics/api/get-summary';
import { HIKARU_BLITZ_SUMMARY } from '@/features/summary-statistics/api/get-summary.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';

const NOW = new Date('2026-11-11T12:00:00Z');

describe('summary-statistics api', () => {
  it('maps the API response to the summary page data', () => {
    const stats = toSummaryStats(HIKARU_BLITZ_SUMMARY, '7', 'blitz', NOW);

    expect(stats).toMatchObject({
      timeFrame: '7',
      timeClass: 'blitz',
      from: 'Nov 4, 2026',
      to: 'Nov 11, 2026',
      games: 7,
      wins: 5,
      draws: 0,
      losses: 2,
      winRate: 71, // 0.7143 -> 71 %
      expectedRating: null,
      actualRating: 3467,
      difference: null,
      lastChange: -30,
    });
    expect(stats.ratingHistory).toHaveLength(7);
    expect(stats.ratingHistory[0]).toEqual({ date: '2026-10-31', rating: 3455 });
  });

  it('labels the all-time period', () => {
    const stats = toSummaryStats(
      { ...HIKARU_BLITZ_SUMMARY, dayPeriod: 'all' },
      'all',
      'blitz',
      NOW,
    );

    expect(stats.from).toBe('All time');
    expect(stats.to).toBe('Nov 11, 2026');
  });

  it('calls the summary endpoint with period and time class in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_BLITZ_SUMMARY);

    const stats = await getSummary('hikaru', '7', 'blitz');

    expect(stats.games).toBe(7);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/hikaru/summary?period=7&timeClass=blitz',
      expect.anything(),
    );
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});

    await getSummary('hikaru', '30', 'blitz');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
