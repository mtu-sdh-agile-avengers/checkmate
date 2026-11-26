import { useCallback, useEffect, useState } from 'react';
import { motionAllowed } from '@/utils/motion';

/**
 * The players' entrance when a game starts: `walking` from the moment `seated` turns true for
 * `durationMs`, while the stylesheet walks them in (play-computer.css). It never holds the
 * game up: the board takes moves throughout, and `skip()` (wired to any click or key press)
 * sits them down at once. With reduced motion they are simply seated.
 */
export function useArrival(seated: boolean, durationMs: number) {
  const [walking, setWalking] = useState(false);
  const [wasSeated, setWasSeated] = useState(seated);
  if (seated !== wasSeated) {
    setWasSeated(seated);
    setWalking(seated && motionAllowed());
  }

  useEffect(() => {
    if (!walking) return;
    const timer = setTimeout(() => setWalking(false), durationMs);
    return () => clearTimeout(timer);
  }, [walking, durationMs]);

  const skip = useCallback(() => setWalking(false), []);
  return { walking, skip };
}
