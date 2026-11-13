import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiMode } from '@/config/api';
import { ROUTES } from '@/config/routes';
import { usePlayerSearch } from '@/features/player-search/hooks/use-player-search';

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const search = usePlayerSearch();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    try {
      const player = await search.mutateAsync(query);
      navigate(ROUTES.summary(player.username));
    } catch (error: unknown) {
      setValidationError(error instanceof Error ? error.message : 'Unable to search. Please try again.');
    }
  }

  return (
    <form className="search-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label htmlFor="player-query" className="sr-only">Chess.com username or member profile URL</label>
      <div className="search-combo">
        <Search size={22} aria-hidden="true" />
        <input
          id="player-query"
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setValidationError(''); search.reset(); }}
          placeholder="Enter a Chess.com username or profile URL"
          autoComplete="off"
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? 'search-error' : 'search-help'}
        />
        <button type="submit" className="button button-dark search-submit" disabled={search.isPending}>
          {search.isPending ? 'Searching…' : 'Search player'} <ArrowRight size={19} aria-hidden="true" />
        </button>
      </div>
      {validationError ? <p id="search-error" className="form-error" role="alert">{validationError}</p> :
        getApiMode() === 'live' ? (
          <p id="search-help" className="form-help">Type a Chess.com username or paste a profile link (https://www.chess.com/member/…).</p>
        ) : (
          <p id="search-help" className="form-help">Try <button type="button" className="inline-demo" onClick={() => setQuery('hikaru')}>hikaru</button> for the demo. No live account lookup is performed.</p>
        )}
    </form>
  );
}
