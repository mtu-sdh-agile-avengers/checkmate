import { describe, expect, it, vi } from 'vitest';
import {
  checkPlayers,
  comparePlayers,
  toComparison,
} from '@/features/player-comparison/api/compare-players';
import { HIKARU_VS_TESTER } from '@/features/player-comparison/api/compare-players.fixtures';
import { ValidationError } from '@/lib/errors';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('player-comparison api', () => {
  it('maps the API response to the comparison page data', () => {
    const comparison = toComparison(HIKARU_VS_TESTER);

    expect(comparison).toMatchObject({
      timeClass: 'rapid',
      player1: 'hikaru',
      player2: 'checkmate_tester',
      winLikelihood: { player1: 97.4, player2: 2.6 },
      winner: 'hikaru',
    });
    expect(comparison.metrics).toEqual([
      { key: 'games', label: 'Games played', player1: 494, player2: 1505, better: 'player2' },
      { key: 'wins', label: 'Wins', player1: 205, player2: 800, better: 'player2' },
      { key: 'draws', label: 'Draws', player1: 220, player2: 95, better: null },
      { key: 'losses', label: 'Losses', player1: 69, player2: 610, better: 'player1' },
      { key: 'winRate', label: 'Win rate', player1: 42, player2: 53, better: 'player2' },
      {
        key: 'currentRating',
        label: 'Current rating',
        player1: 2838,
        player2: 2210,
        better: 'player1',
      },
      {
        key: 'highestRating',
        label: 'Highest rating',
        player1: 2927,
        player2: 2275,
        better: 'player1',
      },
    ]);
  });

  it('leaves out the likelihood and highlights when a player has no rating', () => {
    const comparison = toComparison({
      ...HIKARU_VS_TESTER,
      player2: {
        ...HIKARU_VS_TESTER.player2,
        rating: { ...HIKARU_VS_TESTER.player2.rating, current: null, highest: null },
      },
      winLikelihood: null,
      winner: null,
    });

    expect(comparison.winLikelihood).toBeNull();
    expect(comparison.winner).toBeNull();
    const rating = comparison.metrics.find((metric) => metric.key === 'currentRating');
    expect(rating).toMatchObject({ player2: null, better: null });
  });

  it('calls the comparison endpoint with both usernames in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_VS_TESTER);

    const comparison = await comparePlayers(
      'https://www.chess.com/member/Hikaru',
      'checkmate_tester',
      'rapid',
    );

    expect(comparison.winner).toBe('hikaru');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/compare?p1=hikaru&p2=checkmate_tester&timeClass=rapid',
      expect.anything(),
    );
  });

  it('shows the API message when players are unavailable', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ detail: 'Players ghost1, ghost2 data is unavailable' }, 404);

    await expect(comparePlayers('ghost1', 'ghost2', 'blitz')).rejects.toMatchObject({
      status: 404,
      message: 'Players ghost1, ghost2 data is unavailable',
    });
  });

  it('reports invalid input as a ValidationError, which is not retried', () => {
    expect(() => checkPlayers('hikaru', 'ab')).toThrow(ValidationError);
    expect(() => checkPlayers('hikaru', 'HIKARU')).toThrow(ValidationError);
    expect(checkPlayers('https://www.chess.com/member/Hikaru', 'Magnus')).toEqual([
      'hikaru',
      'magnus',
    ]);
  });

  it('checks both inputs before calling the API', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_VS_TESTER);

    await expect(comparePlayers('hikaru', 'https://example.com/x', 'blitz')).rejects.toThrow(
      /^Player 2: /,
    );
    await expect(
      comparePlayers('Hikaru', 'https://chess.com/member/hikaru', 'blitz'),
    ).rejects.toThrow('Choose two different players to compare.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});

    const comparison = await comparePlayers('hikaru', 'magnus', 'blitz');

    expect(comparison).toMatchObject({ player1: 'hikaru', player2: 'magnus', winner: 'hikaru' });
    expect(comparison.winLikelihood?.player1).toBeGreaterThan(50);
    expect(comparison.metrics.map((metric) => metric.better)).toContain('player2');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(comparePlayers('notfound', 'notfound2', 'blitz')).rejects.toThrow(
      'Players notfound, notfound2 data is unavailable',
    );
  });
});
