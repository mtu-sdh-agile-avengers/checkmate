import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType, type Location } from 'react-router-dom';

const STORAGE_KEY = 'checkmate:scroll';
/** How many history entries keep their position (the oldest are forgotten). */
const MAX_ENTRIES = 50;
/** How long a position waits for its page to be tall enough (views arrive with the camera). */
const RESTORE_WITHIN_MS = 1500;

type Positions = Record<string, number>;

function readPositions(): Positions {
  try {
    const data: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Positions) : {};
  } catch {
    return {};
  }
}

function writePositions(positions: Positions): void {
  const kept = Object.fromEntries(Object.entries(positions).slice(-MAX_ENTRIES));
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // storage unavailable: positions last for this page only
  }
}

const scrollToY = (top: number) => window.scrollTo({ top, left: 0, behavior: 'instant' });

/**
 * Where the page is scrolled to, across navigation. The browser's own restoration is off: it
 * runs before a view has rendered, so it lands short or not at all.
 * - Back or forward (and a reload): the page returns to where it was on that history entry,
 *   once it is tall enough (a view arrives with the camera, and its data may come after); a
 *   wheel, touch or key of the visitor's meanwhile cancels it.
 * - A new page (another path): the top. The view leaving keeps its place on screen while it
 *   goes (player-view.tsx), so nothing jumps.
 * - Only the query changes (a channel of the player's TV, a filter, a game opened on it): the
 *   page stays where it is.
 * Positions are kept per history entry for the session (sessionStorage).
 */
export function ScrollMemory() {
  const location = useLocation();
  const navigation = useNavigationType();
  const positions = useRef<Positions | null>(null);
  const key = useRef(location.key);
  const previous = useRef<Location | null>(null);
  const cancelRestore = useRef<() => void>(() => undefined);

  // One listener for the whole visit: each scroll is the position of the entry shown, which
  // changes in the same commit as the page (below), never a frame late.
  useEffect(() => {
    positions.current ??= readPositions();
    const record = () => {
      if (positions.current) positions.current[key.current] = window.scrollY;
    };
    const save = () => {
      if (positions.current) writePositions(positions.current);
    };
    window.addEventListener('scroll', record, { passive: true });
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('scroll', record);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, []);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const before = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = before;
    };
  }, []);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = location;
    key.current = location.key;
    if (from?.key === location.key) return;
    cancelRestore.current();
    positions.current ??= readPositions();
    if (navigation === 'POP') {
      cancelRestore.current = restore(positions.current[location.key] ?? 0);
    } else if (from && from.pathname !== location.pathname) {
      scrollToY(0);
      positions.current[location.key] = 0;
    } else {
      // The same page (a new entry for a new query): its place carries over.
      positions.current[location.key] = window.scrollY;
    }
  }, [location, navigation]);

  useEffect(() => () => cancelRestore.current(), []);

  return null;
}

/** Scrolls to `top` as soon as the page is tall enough, for a while; returns a cancel. */
function restore(top: number): () => void {
  if (top <= 0) {
    scrollToY(0);
    return () => undefined;
  }
  const started = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(type, stop);
  };
  const attempt = () => {
    const reachable = document.documentElement.scrollHeight - window.innerHeight;
    scrollToY(Math.min(top, Math.max(0, reachable)));
    if (reachable >= top || performance.now() - started > RESTORE_WITHIN_MS) stop();
    else frame = requestAnimationFrame(attempt);
  };
  for (const type of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(type, stop, { passive: true });
  attempt();
  return stop;
}
