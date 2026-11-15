import { useEffect, useRef, useState } from 'react';

export type TvSignal = { active: boolean; content: number; revision: number };

/** The scheduler wakes four times a second; a render only happens when a set changes channel. */
export const TICK_MS = 250;
/** Dwell times in ticks. Means of 30 and 10 ticks keep each set on static 75% of the time. */
export const STATIC_TICKS = [18, 42] as const;
export const PICTURE_TICKS = [7, 13] as const;
const CHANNELS = 9;

const between = ([low, high]: readonly [number, number]) => low + Math.floor(Math.random() * (high - low + 1));
const allStatic = (count: number): TvSignal[] => Array.from({ length: count }, (_, index) => ({
  active: false, content: index % CHANNELS, revision: 0,
}));

/** Every set runs its own static -> picture -> static loop, so the stage flickers
 * irregularly: about a quarter of the screens carry a picture at any moment.
 * Pausing, a hidden tab and reduced motion all stop the clock without losing state. */
export function useTvSignals(paused: boolean, count: number): TvSignal[] {
  const [signals, setSignals] = useState(() => allStatic(count));
  const current = useRef(signals);
  const remaining = useRef<number[]>([]);

  useEffect(() => {
    if (current.current.length !== count) {
      current.current = allStatic(count);
      remaining.current = [];
      setSignals(current.current);
    }
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;

    function publish(next: TvSignal[]) {
      current.current = next;
      setSignals(next);
    }
    function tick() {
      let changed = false;
      const next = current.current.map((signal, index) => {
        remaining.current[index] = (remaining.current[index] ?? 1) - 1;
        if (remaining.current[index]! > 0) return signal;
        changed = true;
        if (signal.active) {
          remaining.current[index] = between(STATIC_TICKS);
          return { ...signal, active: false };
        }
        remaining.current[index] = between(PICTURE_TICKS);
        return {
          active: true,
          content: (signal.content + 1 + Math.floor(Math.random() * (CHANNELS - 1))) % CHANNELS,
          revision: signal.revision + 1,
        };
      });
      if (changed) publish(next);
    }
    function sync() {
      clearInterval(timer);
      timer = undefined;
      if (media.matches) {
        // Reduced motion: one still frame, a quarter of the sets holding a picture.
        remaining.current = [];
        publish(current.current.map((signal, index) => ({ ...signal, active: index % 4 === 1 })));
        return;
      }
      if (paused || document.hidden || count === 0) return;
      if (remaining.current.length !== count) {
        // Spread the first reveals out so the sets never change in unison.
        remaining.current = current.current.map(signal => signal.active ? between(PICTURE_TICKS) : 2 + Math.floor(Math.random() * 29));
      }
      timer = setInterval(tick, TICK_MS);
    }
    sync();
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(timer);
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [paused, count]);
  return signals;
}
