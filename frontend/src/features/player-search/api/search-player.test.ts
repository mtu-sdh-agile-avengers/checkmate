import { describe, expect, it, vi } from 'vitest';
import { searchPlayer } from '@/features/player-search/api/search-player';
import type { PlayerSearchDto } from '@/features/player-search/api/search-player';
import { ApiError } from '@/lib/api-client';
import { mockFetchJson } from '@/testing/mock-fetch';

// Our API response for "hikaru" (backend: PlayerSearchProfileResponse)
const HIKARU: PlayerSearchDto = {
  username: 'hikaru',
  url: 'https://www.chess.com/member/Hikaru',
  avatar:
    'https://images.chesscomfiles.com/uploads/v1/user/15448422.88c010c1.200x200o.3c5619f5441e.png',
  title: 'GM',
};

describe('player-search api', () => {
  it('calls the search endpoint with the parsed username in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU);

    const player = await searchPlayer('https://www.chess.com/member/Hikaru');

    expect(player).toEqual(HIKARU);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/?search=hikaru', expect.anything());
  });

  it('shows the API message when the player does not exist', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ detail: 'No Chess.com player found for "ghost_player"' }, 404);

    const error = await searchPlayer('ghost_player').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      message: 'No Chess.com player found for "ghost_player"',
    });
  });

  it('rejects an invalid input without calling the API', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU);

    await expect(searchPlayer('https://example.com/member/hikaru')).rejects.toThrow(/chess.com/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});

    const player = await searchPlayer('Hikaru');

    expect(player).toMatchObject({ username: 'hikaru', title: 'GM' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
