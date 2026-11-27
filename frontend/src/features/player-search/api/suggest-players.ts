import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockSuggestPlayers } from '@/lib/mock-api';
import type { PlayerSuggestion } from '@/types/chess';

/** Response of GET /api/v1/players/suggestions?q= (backend: PlayerSuggestionsResponse). */
export type PlayerSuggestionsDto = { query: string; players: PlayerSuggestion[] };

/** What can be the start of a Chess.com username: 2-25 letters, numbers, _ or - (the backend
 *  checks the same). Anything else (one letter, a profile link) gets no suggestions. */
export const SUGGESTION_PREFIX = /^[A-Za-z0-9_-]{2,25}$/;

/**
 * Accounts whose username starts with `prefix`, at most 8: the account with exactly that
 * username first (if it exists), then titled players (GM, IM, FM...).
 *
 * @throws ApiError e.g. 429 when typing faster than the limit allows (the dropdown keeps what it had)
 */
export async function suggestPlayers(prefix: string): Promise<PlayerSuggestion[]> {
  if (getApiMode() === 'mock') return mockSuggestPlayers(prefix);
  const dto = await apiGet<PlayerSuggestionsDto>('/players/suggestions', { q: prefix });
  return dto.players;
}
