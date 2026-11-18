import { Suspense, lazy, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { usePlayer } from '@/features/player-profile/hooks/use-player';
import { searchPlayer } from '@/features/player-search/api/search-player';
import { SearchPage } from '@/features/player-search/components/search-page';
import { afterMotion } from '@/utils/motion';
import './stage-layout.css';

// The 3D stage is decoration, and the other views are only needed once opened: all of them
// load after the search itself is on screen.
const loadPlayerView = () => import('@/app/player-view');
const loadPlayComputer = () => import('@/features/play-computer/components/play-computer-view');
const loadDeliberation = () => import('@/features/deliberation/components/deliberation-view');
const ChessStage = lazy(() => import('@/components/chess/chess-stage').then((m) => ({ default: m.ChessStage })));
const PlayerView = lazy(() => loadPlayerView().then((m) => ({ default: m.PlayerView })));
const PlayComputerView = lazy(() => loadPlayComputer().then((m) => ({ default: m.PlayComputerView })));
const DeliberationView = lazy(() => loadDeliberation().then((m) => ({ default: m.DeliberationView })));

type TopDownView = 'computer' | 'deliberation';
export type StageView = 'search' | 'player' | TopDownView;

/** The camera move between views (--cam-time in stage-layout.css): a closing view stays on
 *  screen this long, to be seen leaving. */
const CAMERA_MS = 700;

/** Says when `children` are on screen (and when they go): a view loaded on demand is only
 *  committed once its code has arrived, so this is the moment the camera can start moving
 *  to it, and the view's entrance and the stage's exit begin on the same frame. */
function Arrival({ id, onArrive, children }: { id: string; onArrive: (id: string | null) => void; children: ReactNode }) {
  useLayoutEffect(() => {
    onArrive(id);
    return () => onArrive(null);
  }, [id, onArrive]);
  return children;
}

/** `value`, kept for `ms` after it turns null: long enough for an exit animation. */
function useLingering<T>(value: T | null, ms: number): T | null {
  const [kept, setKept] = useState(value);
  if (value !== null && value !== kept) setKept(value);
  useEffect(() => {
    if (value !== null) return;
    const timer = setTimeout(() => setKept(null), afterMotion(ms));
    return () => clearTimeout(timer);
  }, [value, ms]);
  return value ?? kept;
}

/**
 * The one screen of the app: the chess stage with the table set on it.
 * - `/` is the search view, with the main menu under the search.
 * - `/players/:username` is the same stage with the camera panned to the opponent's seat,
 *   where the television shows that player's profile and statistics.
 * - `/play` (In-Game Chess) and `/deliberation` tilt the camera down onto the chess set; the
 *   stage travels up out of view and sleeps meanwhile.
 * The view is a data attribute; the stylesheets turn it into the camera moves. A view that
 * closes stays mounted for the length of the move, so it is seen leaving rather than cut.
 */
export function StageLayout() {
  const { username } = useParams<{ username: string }>();
  const { pathname } = useLocation();
  const topDown: TopDownView | null = pathname === ROUTES.play ? 'computer' : pathname === ROUTES.deliberation ? 'deliberation' : null;
  const scene = useLingering(topDown, CAMERA_MS);
  const shownPlayer = useLingering(username ?? null, CAMERA_MS);
  // The camera moves to a view once that view is there (see Arrival); until then it holds.
  const [arrived, setArrived] = useState<string | null>(null);
  const target = username ? `player:${username}` : topDown;
  const view: StageView = target !== null && arrived === target ? (username ? 'player' : (topDown ?? 'search')) : 'search';
  // Same query as the profile panel, so this costs no extra request: it is only here to
  // put the player's picture on the figure in the opponent's seat.
  const { data: player } = usePlayer(username ?? '');

  // While the visitor is on the search, fetch the other views in the background, so the
  // camera never waits for code when one is opened.
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const warm = () => {
      void loadPlayerView();
      void loadPlayComputer();
      void loadDeliberation();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="stage-screen" data-view={view}>
      {/* First in the markup, so reading and tab order start with the search. */}
      <SearchPage guest={username} guestAvatar={player?.avatar} topDown={topDown} />
      {shownPlayer && (
        <Suspense fallback={null}>
          <Arrival key={shownPlayer} id={`player:${shownPlayer}`} onArrive={setArrived}>
            <PlayerView username={shownPlayer} leaving={!username} />
          </Arrival>
        </Suspense>
      )}
      {scene && (
        <Suspense fallback={null}>
          <Arrival key={scene} id={scene} onArrive={setArrived}>
            {/* Deliberation finds its players with the same search as the search page. */}
            {scene === 'computer' ? <PlayComputerView leaving={!topDown} /> : <DeliberationView findPlayer={searchPlayer} leaving={!topDown} />}
          </Arrival>
        </Suspense>
      )}
      <Suspense fallback={null}><ChessStage dormant={view === 'computer' || view === 'deliberation'} /></Suspense>
    </div>
  );
}
