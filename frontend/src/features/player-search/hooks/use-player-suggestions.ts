import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SUGGESTION_PREFIX, suggestPlayers } from '@/features/player-search/api/suggest-players';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { PlayerSuggestion } from '@/types/chess';

/** Suggestions are asked for once typing pauses this long. */
export const SUGGEST_DELAY_MS = 300;

const NONE: PlayerSuggestion[] = [];

/**
 * Accounts matching what is typed in the search (`text`), asked for once typing pauses
 * (SUGGEST_DELAY_MS), then kept for a few minutes: going back over the same letters asks again
 * for nothing. While the next answer is on its way, the last one stays, narrowed to what still
 * matches, so the list never empties and refills at every key.
 *
 * Nothing is asked while the list is closed (`open` false: a search sent, Escape, the field
 * left), so a lookup never shares the line with suggestions nobody will see; those already
 * known stay at hand for when it opens again.
 *
 * - `applicable`: what is typed can be the start of a username (2-25 letters, numbers, _ or -);
 * - `players`: the suggestions for it;
 * - `loading`: an answer for what is typed is still to come;
 * - `failed`: the last request failed (the list keeps what it had).
 */
export function usePlayerSuggestions(text: string, open = true) {
  const typed = text.trim();
  const prefix = useDebouncedValue(typed, SUGGEST_DELAY_MS);
  const applicable = SUGGESTION_PREFIX.test(typed);
  const result = useQuery({
    queryKey: ['player-suggestions', prefix.toLowerCase()],
    queryFn: () => suggestPlayers(prefix),
    enabled: open && SUGGESTION_PREFIX.test(prefix),
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const start = typed.toLowerCase();
  const data = result.data ?? NONE;
  const players = applicable ? data.filter((player) => player.username.startsWith(start)) : NONE;
  const loading = applicable && (typed !== prefix || result.isFetching);
  return { applicable, players, loading, failed: applicable && !loading && result.isError };
}
