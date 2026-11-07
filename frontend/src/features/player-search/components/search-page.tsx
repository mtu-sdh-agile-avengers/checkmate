import { LiveChessboard } from '@/components/chess/live-chessboard';
import { SearchForm } from '@/features/player-search/components/search-form';

export function SearchPage() {
  return (
    <div className="search-page">
      <div className="search-copy">
        <span className="eyebrow">01 / PLAYER LOOKUP</span>
        <h1>Find your<br />player<span className="muted-period">.</span></h1>
        <p>Discover the numbers behind every move.</p>
        <SearchForm />
      </div>
      <LiveChessboard />
    </div>
  );
}

