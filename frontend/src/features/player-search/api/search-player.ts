import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockFindPlayer } from '@/lib/mock-api';
import type { PlayerSearchResult } from '@/features/player-search/types/search';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';

/** Response of GET /api/v1/players/?search={username|url} (backend: PlayerSearchProfileResponse). */
export type PlayerSearchDto = {
  username: string;
  url: string;
  avatar: string | null;
  title: string | null;
};

/**
 * Finds a Chess.com player by username or member profile URL.
 *
 * The input is validated here first, so an invalid username never reaches the API.
 * Errors (e.g. 404 "No Chess.com player found for ...") are thrown as `ApiError` with a
 * message SearchForm shows as it is.
 */
export async function searchPlayer(input: string): Promise<PlayerSearchResult> {
  const username = parseChessUsername(input);

  if (getApiMode() === 'mock') {
    const { url, avatar, title } = await mockFindPlayer(username);
    return { username, url, avatar, title };
  }

  return apiGet<PlayerSearchDto>('/players/', { search: username });
}
