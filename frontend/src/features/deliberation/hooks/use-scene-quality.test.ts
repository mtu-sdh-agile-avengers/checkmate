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
