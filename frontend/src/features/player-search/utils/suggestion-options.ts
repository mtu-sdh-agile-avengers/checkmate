import type { RecentPlayer } from '@/features/player-search/utils/recent-players';
import type { PlayerSuggestion } from '@/types/chess';

/** One account in the search's dropdown: looked up before, the one typed, or a titled player. */
export type SuggestionOption = {
  username: string;
  title: string | null;
  avatar: string | null;
  kind: 'recent' | 'exact' | 'titled';
};

/** What the dropdown says when it has no account to offer. */
export type SuggestionStatus = 'loading' | 'empty' | 'failed';

/** At most this many accounts in the dropdown. */
export const MAX_OPTIONS = 8;

/** The element id of the option at `index` (for the input's aria-activedescendant). */
export const optionId = (listId: string, index: number) => `${listId}-option-${index}`;

/**
 * The accounts to offer for what is typed (`typed`, lowercase): the account with exactly that
 * name first, then the players looked up before, then the other suggestions; each once. With
 * nothing typed, the players looked up before. A profile link gets none.
 */
export function suggestionOptions(typed: string, recent: readonly RecentPlayer[], found: readonly PlayerSuggestion[]): SuggestionOption[] {
  if (typed.includes('/')) return [];
  const options: SuggestionOption[] = [
    ...recent.filter((player) => player.username.startsWith(typed)).map((player) => ({ ...player, kind: 'recent' as const })),
    ...found.map((player) => ({
      username: player.username,
      title: player.title,
      avatar: player.avatar,
      kind: player.exact ? ('exact' as const) : ('titled' as const),
    })),
  ];
  const once = options.filter((option, index) => options.findIndex((other) => other.username === option.username) === index);
  const exact = once.filter((option) => option.username === typed);
  return [...exact, ...once.filter((option) => option.username !== typed)].slice(0, MAX_OPTIONS);
}
