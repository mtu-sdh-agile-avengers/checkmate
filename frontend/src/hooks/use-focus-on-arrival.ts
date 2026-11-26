import { useEffect, type RefObject } from 'react';

/**
 * Moves focus to `target` once it can take it. Panels and sets that arrive with an entrance
 * animation stay hidden (visibility) until it plays, and a hidden element cannot be focused,
 * so this keeps trying a frame at a time, for up to `withinMs`. Runs again whenever
 * `when` changes to true.
 */
export function useFocusOnArrival(target: RefObject<HTMLElement | null>, when = true, withinMs = 2500) {
  useEffect(() => {
    if (!when) return;
    const started = performance.now();
    let frame = 0;
    const focus = () => {
      const element = target.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      if (document.activeElement !== element && performance.now() - started < withinMs) frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, [target, when, withinMs]);
}
