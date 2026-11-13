import { mockFindPlayer } from '@/lib/mock-api';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';
import type { Player } from '@/types/chess';

/*
 * TODO(CMG4-47): connect the search to the backend API.
 *
 * BLOCKED by CMG4-83: `GET /api/v1/players/?search={username|url}` is routed in
 * backend/app/src/api/v1/players.py, but `ChessComPlayersService.search` still raises
 * NotImplementedError, so calling it in live mode would fail for every player.
 *
 * When the endpoint works, follow get-player.ts and get-summary.ts:
 *
 *   if (getApiMode() === 'mock') return mockFindPlayer(username);
 *   const dto = await apiGet<PlayerSearchDto>('/players/', { search: username });
 *
 * - The response (backend: PlayerSearchProfileResponse) is { username, url, avatar, title },
 *   which is narrower than `Player`: agree the return type first. SearchForm only reads `username`.
 * - A 404 becomes an ApiError; SearchForm already shows its message on the search page
 *   (role="alert"), so "player not found" needs no extra UI.
 *
 * Until then both modes resolve from demo data, and in live mode an unknown player is
 * reported by the profile view after the redirect.
 */
export async function searchPlayer(input: string): Promise<Player> {
  const username = parseChessUsername(input);
  return mockFindPlayer(username);
}
