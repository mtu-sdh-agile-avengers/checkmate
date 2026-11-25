import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSceneQuality } from './use-scene-quality';

const motion = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced, media: query, addEventListener() {}, removeEventListener() {} }));

describe('scene quality', () => {
  it('is still with reduced motion (and where nothing can be shown)', () => {
    expect(renderHook(() => useSceneQuality(false)).result.current).toBe('still');
    motion(true);
    expect(renderHook(() => useSceneQuality(false)).result.current).toBe('still');
  });

  it('is lite on a device with few cores, full otherwise', () => {
    motion(false);
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
    expect(renderHook(() => useSceneQuality(false)).result.current).toBe('lite');
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    expect(renderHook(() => useSceneQuality(false)).result.current).toBe('full');
  });
});

describe('scene quality, measured', () => {
  function frames(times: number[]) {
    let index = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const time = times[index++];
      if (time !== undefined) callback(time);
      return index;
    });
  }

  it('drops to lite when the games run slowly', () => {
    motion(false);
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    frames([1000, 1500, 2000, 2600]); // about 2 frames a second
    expect(renderHook(() => useSceneQuality(true)).result.current).toBe('lite');
  });

  it('stays full when the games run smoothly', () => {
    motion(false);
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    frames(Array.from({ length: 200 }, (_, i) => 1000 + i * 16));
    expect(renderHook(() => useSceneQuality(true)).result.current).toBe('full');
  });
});
