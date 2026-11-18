import { useCallback, useEffect, useState, type RefObject } from 'react';
import { afterMotion } from '@/utils/motion';

export type IntroState = 'playing' | 'done';

/**
 * An entrance sequence: the CSS animations inside `root` that play for the first
 * `durationMs` after it mounts (a camera move, a panel sliding in, a set dropping in).
 *
 * `skip` jumps every animation still running in `root` to its end and marks the intro done:
 * wire it to the root's pointer and key events, so a visitor in a hurry is never held up.
 * With reduced motion the intro is done from the start.
 */
export function useIntro(root: RefObject<HTMLElement | null>, durationMs: number) {
  const [state, setState] = useState<IntroState>(() => (afterMotion(durationMs) === 0 ? 'done' : 'playing'));
  // Skipped rather than played out: anything animating outside CSS (the 3D set) jumps to its end too.
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (state === 'done') return;
    const timer = setTimeout(() => setState('done'), durationMs);
    return () => clearTimeout(timer);
  }, [state, durationMs]);

  const skip = useCallback(() => {
    if (state === 'done') return;
    const element = root.current;
    if (element && typeof element.getAnimations === 'function') {
      for (const animation of element.getAnimations({ subtree: true })) {
        // Endless loops (none in an intro, but be safe) cannot be finished.
        if (animation.effect?.getComputedTiming().iterations === Infinity) continue;
        try {
          animation.finish();
        } catch {
          // An animation that cannot finish is left to play out.
        }
      }
    }
    setState('done');
    setSkipped(true);
  }, [state, root]);

  return { state, done: state === 'done', skipped, skip };
}
