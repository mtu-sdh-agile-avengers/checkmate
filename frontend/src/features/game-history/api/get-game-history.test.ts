import { describe, expect, it, vi } from 'vitest';
import {
  getGameHistory,
  toGameHistoryPage,
  toQueryParams,
} from '@/features/game-history/api/get-game-history';
import { HIKARU_BLITZ_PAGE } from '@/features/game-history/api/get-game-history.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('game-history api', () => {
  it('maps the API response to the game history page', () => {
    const page = toGameHistoryPage(HIKARU_BLITZ_PAGE);

    expect(page).toMatchObject({
      archive: { year: 2026, month: 10 },
      pageSize: 2,
      totalGames: 8,
      totalPages: 4,
      page: 1,
      hasNext: true,
    });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toEqual({
      id: '186299800014',
      url: 'https://www.chess.com/game/live/186299800014',
      timeClass: 'blitz',
      timeControl: '3 min',
      endTime: Date.parse('2026-10-31T19:39:20Z') / 1000,
      date: 'Oct 31, 2026',
      dateTime: '31 Oct 2026, 19:39 UTC',
      rated: true,
      rules: 'chess',
      result: 'win',
      player: { username: 'Hikaru', rating: 3453, color: 'white' },
      opponent: { username: 'Sina-Movahed', rating: 3299, color: 'black' },
      averageRating: 3376,
      archive: { year: 2026, month: 10 }, // opens the game page with useGame
    });
    expect(page.items[1]?.opponent.color).toBe('white');
  });

  it('maps a player without games', () => {
    const page = toGameHistoryPage({
      ...HIKARU_BLITZ_PAGE,
      year: null,
      month: null,
      items: [],
      totalGames: 0,
      totalPages: 0,
      hasNext: false,
    });

    expect(page).toMatchObject({ archive: null, items: [], totalGames: 0 });
  });

  it('sends only the filters that are set', () => {
    expect(toQueryParams({})).toEqual({});
    expect(
      toQueryParams({
        archive: { year: 2026, month: 10 },
        timeClass: 'blitz',
        sortBy: 'avgRating',
        sortOrder: 'asc',
        pageSize: 10,
        page: 2,
      }),
    ).toEqual({
      year: '2026',
      month: '10',
      timeClass: 'blitz',
      sortBy: 'avgRating',
      sortOrder: 'asc',
      pagingLimit: '10',
      page: '2',
    });
  });

  it('calls the game list endpoint in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_BLITZ_PAGE);

    const page = await getGameHistory('hikaru', {
      archive: { year: 2026, month: 10 },
      timeClass: 'blitz',
      pageSize: 5,
    });

    expect(page.totalGames).toBe(8);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/hikaru/games/list?year=2026&month=10&timeClass=blitz&pagingLimit=5',
      expect.anything(),
    );
  });

  it('uses demo data in mock mode, filtered, sorted and paged', async () => {
    const fetchMock = mockFetchJson({});

    const page = await getGameHistory('hikaru', {
      timeClass: 'bullet',
      sortBy: 'avgRating',
      sortOrder: 'desc',
      pageSize: 5,
      page: 2,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(page).toMatchObject({
      page: 2,
      pageSize: 5,
      totalGames: 20,
      totalPages: 4,
      hasNext: true,
    });
    expect(page.items).toHaveLength(5);
    expect(page.items.every((game) => game.timeClass === 'bullet')).toBe(true);
    const ratings = page.items.map((game) => game.averageRating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    await expect(getGameHistory('notfound')).rejects.toThrow(/not in the demo data/);
  });
});

describe('game-history api without an archive month', () => {
  it("takes each game's month from its end time", () => {
    const page = toGameHistoryPage({ ...HIKARU_BLITZ_PAGE, year: null, month: null });

    expect(page.archive).toBeNull();
    expect(page.items[0]?.archive).toEqual({ year: 2026, month: 10 });
  });
});
