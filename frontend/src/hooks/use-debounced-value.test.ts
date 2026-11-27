import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers());

  it('gives the value once it has stopped changing for the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'h' } });

    rerender({ value: 'hi' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'hik' }); // typing on: the wait starts again
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('h');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('hik');
  });
});
