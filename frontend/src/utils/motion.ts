/** Whether decorative motion should play: not for reduced motion, and not where nothing is
 *  displayed to animate (tests run without `matchMedia`). Read on each call, so a change of
 *  the system setting applies from the next transition. */
export function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** A wait for an animation to finish: `ms` while motion plays, 0 when it does not. */
export const afterMotion = (ms: number): number => (motionAllowed() ? ms : 0);
