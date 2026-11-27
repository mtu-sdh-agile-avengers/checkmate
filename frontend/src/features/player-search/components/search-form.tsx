import { useId, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiMode } from '@/config/api';
import { ROUTES } from '@/config/routes';
import { PlayerSuggestions } from '@/features/player-search/components/player-suggestions';
import { usePlayerSearch } from '@/features/player-search/hooks/use-player-search';
import { usePlayerSuggestions } from '@/features/player-search/hooks/use-player-suggestions';
import { loadRecentPlayers, rememberPlayer, type RecentPlayer } from '@/features/player-search/utils/recent-players';
import { optionId, suggestionOptions, type SuggestionStatus } from '@/features/player-search/utils/suggestion-options';

/**
 * The player search: a username or a profile link, looked up on Enter (or Search player).
 *
 * While typing, a dropdown suggests accounts (an ARIA combobox): the account with exactly the
 * name typed, players looked up before (kept in the browser) and Chess.com's titled players,
 * asked for once typing pauses. ↓ and ↑ move through them, Enter opens the one highlighted
 * (or looks up what is typed when none is), Escape closes the list; a click opens an account.
 * It says when it is still searching and when nothing matches.
 */
export function SearchForm() {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(loadRecentPlayers);
  const search = usePlayerSearch();
  const suggestions = usePlayerSuggestions(query, open);
  const navigate = useNavigate();
  const listId = useId();

  const typed = query.trim().toLowerCase();
  const options = useMemo(() => suggestionOptions(typed, recent, suggestions.players), [typed, recent, suggestions.players]);
  // A new list starts with nothing highlighted.
  const listKey = options.map((option) => option.username).join(' ');
  const [shownList, setShownList] = useState(listKey);
  if (listKey !== shownList) {
    setShownList(listKey);
    setActive(-1);
  }

  const status: SuggestionStatus | null =
    !typed || options.length > 0 || !suggestions.applicable
      ? null
      : suggestions.loading
        ? 'loading'
        : suggestions.failed
          ? 'failed'
          : 'empty';
  const listed = open && options.length > 0;

  const openPlayer = (player: RecentPlayer) => {
    setRecent(rememberPlayer(player));
    setOpen(false);
    navigate(ROUTES.profile(player.username));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    setValidationError('');
    try {
      const player = await search.mutateAsync(query);
      setRecent(rememberPlayer(player));
      navigate(ROUTES.profile(player.username));
    } catch (error: unknown) {
      setValidationError(error instanceof Error ? error.message : 'Unable to search. Please try again.');
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); // not the caret
      if (options.length === 0) return;
      const down = event.key === 'ArrowDown';
      if (!listed) {
        setOpen(true);
        setActive(down ? 0 : options.length - 1);
        return;
      }
      setActive((index) => (down ? (index + 1) % options.length : index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      const option = listed ? options[active] : undefined;
      if (option) {
        event.preventDefault(); // the highlighted account, not a lookup of what is typed
        openPlayer(option);
      }
    } else if (event.key === 'Escape' && open && (options.length > 0 || status)) {
      event.preventDefault(); // close the list; the next Escape is the field's own (clears it)
      setOpen(false);
      setActive(-1);
    }
  };

  const announcement = !open
    ? ''
    : options.length > 0
      ? `${options.length} ${options.length === 1 ? 'account' : 'accounts'} suggested. Use the up and down arrows to choose.`
      : status === 'empty'
        ? 'No matching accounts.'
        : '';

  return (
    <form className="search-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label htmlFor="player-query" className="search-field-label">Chess.com username or member profile URL</label>
      <div className="search-box">
        <div className="search-combo">
          <Search size={22} aria-hidden="true" />
          <input
            id="player-query"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listed}
            aria-controls={listId}
            aria-activedescendant={listed && active >= 0 ? optionId(listId, active) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setValidationError('');
              search.reset();
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="Search a player or paste a profile URL..."
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'search-error' : 'search-help'}
          />
          <button type="submit" className="button button-dark search-submit" disabled={search.isPending}>
            {search.isPending ? 'Searching…' : 'Search player'} <ArrowRight size={19} aria-hidden="true" />
          </button>
        </div>
        {open && (
          <PlayerSuggestions id={listId} options={options} active={active} status={status} onPick={openPlayer} onHover={setActive} />
        )}
      </div>
      <p className="sr-only" role="status">{announcement}</p>
      {validationError ? <p id="search-error" className="form-error" role="alert">{validationError}</p> :
        getApiMode() === 'live' ? (
          <p id="search-help" className="form-help">Type a Chess.com username or paste a profile link (https://www.chess.com/member/…).</p>
        ) : (
          <p id="search-help" className="form-help">Try <button type="button" className="inline-demo" onClick={() => setQuery('hikaru')}>hikaru</button> for the demo. No live account lookup is performed.</p>
        )}
    </form>
  );
}
