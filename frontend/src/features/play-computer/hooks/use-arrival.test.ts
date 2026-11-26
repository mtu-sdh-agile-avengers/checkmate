import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useArrival } from '@/features/play-computer/hooks/use-arrival';
import { stubMotion } from '@/testing/motion';

afterEach(() => vi.useRealTimers());

const arrive = () =>
  renderHook(({ seated }) => useArrival(seated, 2600), { initialProps: { seated: false } });

describe('players arriving', () => {
  it('walk in when a game starts, then are seated', () => {
    stubMotion(false);
    vi.useFakeTimers();
    const { result, rerender } = arrive();
    expect(result.current.walking).toBe(false); // no game yet: nobody at the table

    rerender({ seated: true });
    expect(result.current.walking).toBe(true);

    act(() => vi.advanceTimersByTime(2600));
    expect(result.current.walking).toBe(false);
  });

  it('sit down at once when the entrance is skipped', () => {
    stubMotion(false);
    const { result, rerender } = arrive();
    rerender({ seated: true });

    act(() => result.current.skip());

    expect(result.current.walking).toBe(false);
  });

  it('are simply seated with reduced motion', () => {
    stubMotion(true);
    const { result, rerender } = arrive();

    rerender({ seated: true });

    expect(result.current.walking).toBe(false);
  });
});
