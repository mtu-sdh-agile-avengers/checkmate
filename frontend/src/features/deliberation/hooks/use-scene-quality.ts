import { useEffect, useRef, useState } from 'react';
import { DELIBERATION_SCENE, type SceneQuality } from '@/features/deliberation/config/scene';
import { motionAllowed } from '@/utils/motion';

/** Before anything is measured: still for reduced motion, lite for a device that looks slow. */
function startingQuality(): SceneQuality {
  if (!motionAllowed()) return 'still';
  const { liteCores, liteMemoryGb } = DELIBERATION_SCENE.quality;
  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if ((cores && cores <= liteCores) || (memory !== undefined && memory <= liteMemoryGb)) return 'lite';
  return 'full';
}

/**
 * How much of Deliberation's scene to play:
 * - 'full': everything;
 * - 'lite': on a device that looks slow (few cores, little memory) or turns out slow (fewer
 *   than `liteFps` frames a second, measured once while `measuring`, i.e. while the games
 *   run): slower games, no sway, no blur, no dust, plain shadows;
 * - 'still', with reduced motion: nothing moves, every effect is simply there.
 */
export function useSceneQuality(measuring: boolean): SceneQuality {
  const [quality, setQuality] = useState<SceneQuality>(startingQuality);
  const measured = useRef(false);

  useEffect(() => {
    if (!measuring || quality !== 'full' || measured.current) return;
    measured.current = true;
    const { probeMs, liteFps } = DELIBERATION_SCENE.quality;
    let first = 0;
    let frames = 0;
    let frame = 0;
    const count = (now: number) => {
      if (!first) first = now;
      frames += 1;
      if (now - first < probeMs) {
        frame = requestAnimationFrame(count);
        return;
      }
      if ((frames - 1) / ((now - first) / 1000) < liteFps) setQuality('lite');
    };
    frame = requestAnimationFrame(count);
    return () => cancelAnimationFrame(frame);
  }, [measuring, quality]);

  return quality;
}
