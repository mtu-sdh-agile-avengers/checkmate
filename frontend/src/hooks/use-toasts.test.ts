import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToasts } from '@/hooks/use-toasts';

afterEach(() => vi.useRealTimers());

describe('toasts', () => {
  it('stack up, fade over their last moment and go after three seconds', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.show('Your king would be in check.');
    });
    act(() => vi.advanceTimersByTime(1000));
    act(() => {
      result.current.show('Check! Your king is in check.', 'alert');
    });
    expect(result.current.toasts.map((toast) => [toast.message, toast.tone])).toEqual([
      ['Your king would be in check.', 'info'],
      ['Check! Your king is in check.', 'alert'],
    ]);

    act(() => vi.advanceTimersByTime(1800)); // 2.8s for the first: it fades
    expect(result.current.toasts[0]?.closing).toBe(true);
    expect(result.current.toasts[1]?.closing).toBe(false);

    act(() => vi.advanceTimersByTime(200)); // 3s: gone
    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Check! Your king is in check.']);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toasts).toEqual([]);
  });

  it('keeps the four newest, and can clear them all', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      for (const message of ['one', 'two', 'three', 'four', 'five']) result.current.show(message);
    });
    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['two', 'three', 'four', 'five']);

    act(() => result.current.clear());
    expect(result.current.toasts).toEqual([]);
  });

  it('stops its timers when it goes', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useToasts());
    act(() => {
      result.current.show('Check!');
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
