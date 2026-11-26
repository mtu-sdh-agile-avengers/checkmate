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

/** Whether the visitor has asked for reduced motion (false where nothing is displayed). */
export function motionReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** A wait for an animation to finish: `ms` while motion plays, 0 when it does not. */
export const afterMotion = (ms: number): number => (motionAllowed() ? ms : 0);

/** A wait for a transition that becomes a simple fade with reduced motion: `ms` while motion
 *  plays, `fadeMs` for the fade, 0 where nothing is displayed. */
export const afterTransition = (ms: number, fadeMs: number): number =>
  motionAllowed() ? ms : motionReduced() ? fadeMs : 0;
