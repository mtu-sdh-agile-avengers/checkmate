import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatClock, useElapsed } from '@/features/play-computer/hooks/use-elapsed';

afterEach(() => vi.useRealTimers());

describe('elapsed time', () => {
  it('reads seconds as a clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('ticks every second while the game runs, and stops where it is', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'));
    const since = Date.now();
    const { result, rerender } = renderHook(({ running }) => useElapsed(since, running), {
      initialProps: { running: true },
    });
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe(3);

    rerender({ running: false }); // the game is over
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(3);
  });

  it('is zero before a game has started', () => {
    const { result } = renderHook(() => useElapsed(null, true));
    expect(result.current).toBe(0);
  });
});
