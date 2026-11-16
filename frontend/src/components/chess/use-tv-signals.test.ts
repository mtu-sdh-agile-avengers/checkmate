import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TICK_MS, useTvSignals } from './use-tv-signals';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
/* With Math.random pinned to .5 every set waits 16 ticks for its first picture,
   then repeats 10 ticks of picture and 30 ticks of static. */
const FIRST = 16, PICTURE = 10, STATIC = 30;
function setup(count = 8, reduced = false) {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  const media = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  return { media, ...renderHook(({ paused }) => useTvSignals(paused, count), { initialProps: { paused: false } }) };
}
const ticks = (count: number) => act(() => { vi.advanceTimersByTime(count * TICK_MS); });

describe('television signals', () => {
  it('starts on static and shows a picture a quarter of the time', () => {
    const { result } = setup();
    expect(result.current.every(signal => !signal.active)).toBe(true);
    ticks(FIRST);
    expect(result.current.every(signal => signal.active)).toBe(true);
    let onAir = 0;
    const samples = 2 * (PICTURE + STATIC);
    for (let i = 0; i < samples; i++) { if (result.current[0]!.active) onAir++; ticks(1); }
    expect(onAir / samples).toBe(.25);
  });
  it('cuts to a different channel on every reveal', () => {
    const { result } = setup();
    const first = result.current.map(signal => signal.content);
    ticks(FIRST);
    result.current.forEach((signal, index) => {
      expect(signal.content).not.toBe(first[index]);
      expect(signal.revision).toBe(1);
    });
    const second = result.current.map(signal => signal.content);
    ticks(PICTURE);
    expect(result.current.every(signal => !signal.active)).toBe(true);
    ticks(STATIC);
    result.current.forEach((signal, index) => {
      expect(signal.active).toBe(true);
      expect(signal.content).not.toBe(second[index]);
      expect(signal.revision).toBe(2);
    });
  });
  it('freezes while paused and picks up where it left off', () => {
    const { result, rerender } = setup();
    ticks(FIRST + 4);
    const frozen = result.current;
    rerender({ paused: true });
    expect(vi.getTimerCount()).toBe(0);
    ticks(400);
    expect(result.current).toBe(frozen);
    rerender({ paused: false });
    ticks(PICTURE - 5);
    expect(result.current.every(signal => signal.active)).toBe(true);
    ticks(1);
    expect(result.current.every(signal => !signal.active)).toBe(true);
  });
  it('holds one still frame for reduced motion and cleans up on unmount', () => {
    const { result, media, unmount } = setup(8, true);
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.filter(signal => signal.active)).toHaveLength(2);
    ticks(400);
    expect(result.current.filter(signal => signal.active)).toHaveLength(2);
    const change = media.addEventListener.mock.calls[0]![1] as () => void;
    act(() => { media.matches = false; change(); });
    expect(vi.getTimerCount()).toBe(1);
    act(() => { media.matches = true; change(); });
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
