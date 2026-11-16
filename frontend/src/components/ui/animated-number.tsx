import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/utils/format';

/** Count-ups are decoration: skipped for reduced motion and where there is no display to animate on. */
function canAnimate(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A number that counts up to its value when it first appears, and from the old value to
 * the new one when it changes (for example after switching the time frame).
 *
 * @param format turns the (whole) number being shown into text, e.g. `formatNumber` or a percentage
 */
export function AnimatedNumber({
  value,
  format = formatNumber,
  duration = 1300,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(() => (canAnimate() ? 0 : value));
  const current = useRef(shown);

  useEffect(() => {
    if (!canAnimate()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3; // fast start, soft landing
      current.current = Math.round(from + (value - from) * eased);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="animated-number">{format(shown)}</span>;
}
