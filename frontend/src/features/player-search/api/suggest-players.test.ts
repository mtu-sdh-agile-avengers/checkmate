import { describe, expect, it, vi } from 'vitest';
import { SUGGESTION_PREFIX, suggestPlayers } from '@/features/player-search/api/suggest-players';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('suggestPlayers', () => {
  it('asks our API in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const players = [{ username: 'hikaru', url: 'https://www.chess.com/member/Hikaru', avatar: null, title: 'GM', exact: true }];
    const fetchMock = mockFetchJson({ query: 'hik', players });

    await expect(suggestPlayers('hik')).resolves.toEqual(players);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/suggestions?q=hik', expect.anything());
  });

  it('suggests demo accounts in mock mode: the one typed (with the demo picture for hikaru), then titled players', async () => {
    const found = await suggestPlayers('hikaru');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ username: 'hikaru', title: 'GM', exact: true });
    expect(found[0]?.avatar).toMatch(/^data:image\/svg\+xml/);
    expect((await suggestPlayers('ma')).map((player) => player.username)).toEqual(['magnuscarlsen']);
    await expect(suggestPlayers('error')).rejects.toThrow('Demo service unavailable');
  });

  it('only looks up what can start a username', () => {
    expect(SUGGESTION_PREFIX.test('hi')).toBe(true);
    expect(SUGGESTION_PREFIX.test('h')).toBe(false);
    expect(SUGGESTION_PREFIX.test('chess.com/member/hi')).toBe(false);
  });
});
