import { Suspense, lazy, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { usePlayer } from '@/features/player-profile/hooks/use-player';
import { SearchPage } from '@/features/player-search/components/search-page';
import { afterTransition } from '@/utils/motion';
import './stage-layout.css';

// The 3D stage is decoration, and the other views are only needed once opened: all of them
// load after the search itself is on screen.
const loadPlayerView = () => import('@/app/player-view');
const loadPlayComputer = () => import('@/features/play-computer/components/play-computer-view');
const loadDeliberation = () => import('@/app/deliberation-screen');
const ChessStage = lazy(() => import('@/components/chess/chess-stage').then((m) => ({ default: m.ChessStage })));
const PlayerView = lazy(() => loadPlayerView().then((m) => ({ default: m.PlayerView })));
const PlayComputerView = lazy(() => loadPlayComputer().then((m) => ({ default: m.PlayComputerView })));
const DeliberationScreen = lazy(() => loadDeliberation().then((m) => ({ default: m.DeliberationScreen })));

type TopDownView = 'computer' | 'deliberation';
export type StageView = 'search' | 'player' | TopDownView;

/** The camera move between views (--cam-time in stage-layout.css): a closing view stays on
 *  screen this long, to be seen leaving. */
const CAMERA_MS = 700;
/** The top-down views keep their own, longer move: the table tilts away over 0.8s. */
const TOP_DOWN_LEAVE_MS = 800;
/** The return to the menu lasts until the stage has settled back (stage-layout.css): 1.15s
 *  after the view starts leaving on wide screens; narrow screens bring the stage back once
 *  the view has gone, so 0.8s + 0.9s there. */
const RETURN_MS = 2000;
/** With reduced motion the return is a simple fade of this length (stage-layout.css): on
 *  wide screens the view and the stage cross-fade, on narrow ones one after the other. */
const RETURN_FADE_MS = 300;

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

/** `value`, kept for `ms` after it turns null: long enough for an exit animation (`fadeMs`
 *  with reduced motion, where the exit is a fade or nothing). */
function useLingering<T>(value: T | null, ms: number, fadeMs = 0): T | null {
  const [kept, setKept] = useState(value);
  if (value !== null && value !== kept) setKept(value);
  useEffect(() => {
    if (value !== null) return;
    const timer = setTimeout(() => setKept(null), afterTransition(ms, fadeMs));
    return () => clearTimeout(timer);
  }, [value, ms, fadeMs]);
  return value ?? kept;
}

/**
 * The one screen of the app: the chess stage with the table set on it.
 * - `/` is the search view, with the main menu under the search.
 * - `/players/:username` is the same stage with the camera panned to the opponent's seat,
 *   where the television shows that player's profile and statistics.
 * - `/play` (In-Game Chess) and `/deliberation` crane the camera up and tip it down onto the
 *   table; the stage rises out of view, fades and sleeps meanwhile.
 * The view is a data attribute; the stylesheets turn it into the camera moves. A view that
 * closes stays mounted for the length of the move, so it is seen leaving rather than cut.
 *
 * Back from a top-down view to the menu, `data-return` runs the stage's way back: "leaving"
 * while the view is still on screen on its way out, then "settling" until the stage and the
 * table set are back in place; the transitions all hang off it, so none is cut short.
 */
export function StageLayout() {
  const { username } = useParams<{ username: string }>();
  const { pathname } = useLocation();
  const topDown: TopDownView | null = pathname === ROUTES.play ? 'computer' : pathname === ROUTES.deliberation ? 'deliberation' : null;
  const scene = useLingering(topDown, TOP_DOWN_LEAVE_MS, RETURN_FADE_MS);
  // The way back to the menu (data-return below). With reduced motion, on narrow screens the
  // view fades out, then the menu fades in: two fades, and room so the second is not cut short.
  const returning = useLingering(topDown, RETURN_MS, RETURN_FADE_MS * 3);
  const back = !topDown && !username && returning !== null;
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
    // data-return: back from a top-down view, the stage returns its own way (stage-layout.css).
    <div className="stage-screen" data-view={view} data-return={back ? (scene ? 'leaving' : 'settling') : undefined}>
      {/* First in the markup, so reading and tab order start with the search. It stays inert
          until the top-down view has gone, then the menu item that opened it takes focus. */}
      <SearchPage guest={username} guestAvatar={player?.avatar} topDown={scene} />
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
            {/* Deliberation finds its players with the same search as the search page and
                compares them with the player comparison (joined in app/deliberation-screen). */}
            {scene === 'computer' ? <PlayComputerView leaving={!topDown} /> : <DeliberationScreen leaving={!topDown} />}
          </Arrival>
        </Suspense>
      )}
      <Suspense fallback={null}><ChessStage dormant={view === 'computer' || view === 'deliberation'} /></Suspense>
    </div>
  );
}
