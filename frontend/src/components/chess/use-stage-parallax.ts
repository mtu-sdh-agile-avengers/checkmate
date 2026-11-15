import { useEffect, type RefObject } from 'react';

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The layers that move with the pointer; everything else on the stage is left alone. */
const LAYERS = '.stage-world, .stage-rig, .stage-beams, .stage-sign';
const VARS = ['--px', '--py', '--ps'] as const;

/** Feeds the pointer and scroll position to CSS as --px / --py (-1..1) and --ps (0..1).
 * The stylesheet turns them into small camera moves, so layers at different depths
 * slide against each other. The values are written only onto the few layers that move
 * (and are registered as non-inherited in chess-stage.css), so a mouse move restyles
 * those layers and not the hundreds of elements inside them. Nothing runs for touch
 * input, reduced motion or while paused, and writes are batched to one per animation frame. */
export function useStageParallax(ref: RefObject<HTMLElement | null>, paused: boolean) {
  useEffect(() => {
    const stage = ref.current;
    if (!stage || !window.matchMedia) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const layers = [...stage.querySelectorAll<HTMLElement>(LAYERS)];
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    function write(values: readonly [string, string, string] | null) {
      for (const layer of layers) {
        VARS.forEach((name, index) => {
          if (values) layer.style.setProperty(name, values[index] ?? '0');
          else layer.style.removeProperty(name);
        });
      }
    }

    function apply() {
      frame = 0;
      const box = stage!.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = pointer ? clamp(((pointer.x - box.left) / box.width) * 2 - 1, -1, 1) : 0;
      const y = pointer ? clamp(((pointer.y - box.top) / box.height) * 2 - 1, -1, 1) : 0;
      write([x.toFixed(3), y.toFixed(3), clamp(-box.top / box.height, 0, 1).toFixed(3)]);
    }
    function queue() { if (!frame) frame = requestAnimationFrame(apply); }
    function onMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      queue();
    }
    function onLeave() { pointer = null; queue(); }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', queue);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    }
    function sync() {
      stop();
      if (paused || reduced.matches) {
        write(null);
        return;
      }
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', queue, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    sync();
    reduced.addEventListener('change', sync);
    return () => { stop(); reduced.removeEventListener('change', sync); };
  }, [ref, paused]);
}
