import { useEffect, useState } from 'react';

/** Whole seconds since `since`, ticking every second while `running`; it stops where it is. */
export function useElapsed(since: number | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || since === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

/** Seconds as a clock: 75 -> "1:15", 3725 -> "1:02:05". */
export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
