import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubMotion } from '@/testing/motion';
import { useIntro } from './use-intro';

afterEach(() => vi.useRealTimers());

const animation = (iterations: number, finish = vi.fn()) => ({
  effect: { getComputedTiming: () => ({ iterations }) },
  finish,
});

describe('intro', () => {
  it('is done from the start when nothing can move', () => {
    const { result } = renderHook(() => useIntro({ current: null }, 800));
    expect(result.current.done).toBe(true);
    act(() => result.current.skip()); // nothing left to skip
    expect(result.current.state).toBe('done');
  });

  it('plays for its duration, then is done', () => {
    stubMotion(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useIntro({ current: null }, 800));
    expect(result.current.state).toBe('playing');

    act(() => vi.advanceTimersByTime(800));

    expect(result.current.done).toBe(true);
  });

  it('skips to the end of every finite animation', () => {
    stubMotion(false);
    const finite = animation(1);
    const endless = animation(Infinity);
    const stuck = animation(
      1,
      vi.fn(() => {
        throw new Error('cannot finish');
      }),
    );
    const element = document.createElement('div');
    element.getAnimations = vi.fn(() => [
      finite,
      endless,
      stuck,
    ]) as unknown as typeof element.getAnimations;
    const { result } = renderHook(() => useIntro({ current: element }, 800));

    act(() => result.current.skip());

    expect(finite.finish).toHaveBeenCalled();
    expect(endless.finish).not.toHaveBeenCalled();
    expect(result.current.done).toBe(true);
  });
});
