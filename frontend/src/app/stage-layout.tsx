import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { SearchPage } from '@/features/player-search/components/search-page';
import './stage-layout.css';

// The 3D stage is decoration, and the player view is only needed after a search:
// both load after the search itself is on screen.
const ChessStage = lazy(() => import('@/components/chess/chess-stage').then((m) => ({ default: m.ChessStage })));
const PlayerView = lazy(() => import('@/app/player-view').then((m) => ({ default: m.PlayerView })));

/**
 * The one screen of the app: the chess stage with the table set on it.
 * `/` is the search view. `/players/:username` is the same stage with the camera moved to
 * the opponent's seat, where the television shows that player's profile and statistics.
 * The view is a data attribute; the stylesheet turns it into the camera move.
 */
export function StageLayout() {
  const { username } = useParams<{ username: string }>();
  return (
    <div className="stage-screen" data-view={username ? 'player' : 'search'}>
      {/* First in the markup, so reading and tab order start with the search. */}
      <SearchPage guest={username} />
      {username && <Suspense fallback={null}><PlayerView key={username} username={username} /></Suspense>}
      <Suspense fallback={null}><ChessStage /></Suspense>
    </div>
  );
}
