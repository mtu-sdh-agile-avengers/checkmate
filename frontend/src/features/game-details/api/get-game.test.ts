import { describe, expect, it, vi } from 'vitest';
import { getGame, toGameDetails } from '@/features/game-details/api/get-game';
import { HIKARU_GAME } from '@/features/game-details/api/get-game.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';
import { formatTimeControl } from '@/utils/format';

describe('game-details api', () => {
  it('maps the API response to the game page data', () => {
    expect(toGameDetails(HIKARU_GAME)).toEqual({
      id: '186299800014',
      url: 'https://www.chess.com/game/live/186299800014',
      timeClass: 'blitz',
      timeControl: '3 min',
      endTime: Date.parse('2026-10-31T19:39:20Z') / 1000,
      date: 'Oct 31, 2026',
      rated: true,
      rules: 'chess',
      result: 'win',
      player: { username: 'Hikaru', rating: 3453, color: 'white' },
      opponent: { username: 'Sina-Movahed', rating: 3299, color: 'black' },
      averageRating: 3376,
      pgn: HIKARU_GAME.pgn,
      initialFen: HIKARU_GAME.initialSetup,
      finalFen: HIKARU_GAME.fen,
    });
  });

  it('gives the opponent the other color', () => {
    const game = toGameDetails({ ...HIKARU_GAME, color: 'black', result: 'loss' });

    expect(game.player.color).toBe('black');
    expect(game.opponent.color).toBe('white');
    expect(game.result).toBe('loss');
  });

  it('calls the game endpoint with the game id and archive month in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_GAME);

    const game = await getGame('hikaru', '186299800014', { year: 2026, month: 10 });

    expect(game.averageRating).toBe(3376);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/hikaru/games/?search=186299800014&year=2026&month=10',
      expect.anything(),
    );
  });

  it('leaves the archive month to the backend when it is unknown', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_GAME);

    await getGame('hikaru', '186299800014');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/hikaru/games/?search=186299800014',
      expect.anything(),
    );
  });

  it('shows the API message when the game is not found', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ detail: "Game 1 was not found in hikaru's games from 2026-10" }, 404);

    await expect(getGame('hikaru', '1', { year: 2026, month: 10 })).rejects.toMatchObject({
      status: 404,
      message: "Game 1 was not found in hikaru's games from 2026-10",
    });
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});

    const game = await getGame('hikaru', '42', { year: 2026, month: 10 });

    expect(game).toMatchObject({ id: '42', date: 'Oct 15, 2026', result: 'win' });
    expect(game.player).toEqual({ username: 'hikaru', rating: 1512, color: 'white' });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(getGame('hikaru', '0')).rejects.toThrow(/not in the demo data/);
  });
});

describe('formatTimeControl', () => {
  it.each([
    ['180', '3 min'],
    ['180+2', '3 min + 2 s'],
    ['600+5', '10 min + 5 s'],
    ['30', '30 s'],
    ['1/86400', '1 day / move'],
    ['1/259200', '3 days / move'],
    ['1/43200', '12 h / move'],
    ['unknown', 'unknown'],
  ])('%s -> %s', (timeControl, label) => {
    expect(formatTimeControl(timeControl)).toBe(label);
  });
});
