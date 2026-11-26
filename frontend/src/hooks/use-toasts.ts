import { useCallback, useEffect, useRef, useState } from 'react';

/** A notification: `tone` "alert" stands out (a king in check), "info" is the usual. */
export type Toast = { id: number; message: string; tone: 'info' | 'alert'; closing: boolean };

/** How many toasts show at once: a new one pushes the oldest out. */
const MAX_TOASTS = 4;
/** A toast fades out over its last moment (toast-stack.css). */
const FADE_MS = 200;

/**
 * Non-blocking notifications (ToastStack shows them). `show(message)` adds one at the end of
 * the stack; each goes by itself after `durationMs` (3 seconds), fading out over its last
 * 0.2s. They never take focus; the stack announces them politely.
 */
export function useToasts(durationMs = 3000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((run: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, ms);
    timers.current.add(timer);
  }, []);

  const show = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      lastId.current += 1;
      const id = lastId.current;
      setToasts((list) => [...list, { id, message, tone, closing: false }].slice(-MAX_TOASTS));
      later(() => setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast))), durationMs - FADE_MS);
      later(() => setToasts((list) => list.filter((toast) => toast.id !== id)), durationMs);
      return id;
    },
    [durationMs, later],
  );

  const clear = useCallback(() => setToasts([]), []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return { toasts, show, clear };
}
