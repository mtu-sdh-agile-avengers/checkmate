import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubMotion } from '@/testing/motion';
import { useStageParallax } from './use-stage-parallax';

afterEach(() => vi.restoreAllMocks());

function stage() {
  const root = document.createElement('div');
  const world = document.createElement('div');
  world.className = 'stage-world';
  root.append(world);
  root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  return { root, world };
}

/** Animation frames run when the test says so, like a browser between two frames. */
const pending: FrameRequestCallback[] = [];
function nextFrame() {
  for (const callback of pending.splice(0)) callback(0);
}
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
    pending.push(callback),
  );
});

const pointer = (type: string, x = 0, y = 0) =>
  Object.assign(new Event('pointermove'), { pointerType: type, clientX: x, clientY: y });

describe('stage parallax', () => {
  it('feeds the mouse position to the moving layers', () => {
    stubMotion(false);
    const { root, world } = stage();
    renderHook(() => useStageParallax({ current: root }, false));

    window.dispatchEvent(pointer('touch', 200, 100)); // touch is ignored
    nextFrame();
    expect(world.style.getPropertyValue('--px')).toBe('');
    window.dispatchEvent(pointer('mouse', 200, 100));
    window.dispatchEvent(pointer('mouse', 200, 100)); // one write per frame
    nextFrame();
    expect(world.style.getPropertyValue('--px')).toBe('1.000');
    expect(world.style.getPropertyValue('--py')).toBe('1.000');

    document.documentElement.dispatchEvent(new Event('pointerleave'));
    nextFrame();
    expect(world.style.getPropertyValue('--px')).toBe('0.000');
  });

  it('stays still while paused or with reduced motion', () => {
    const media = stubMotion(true);
    const { root, world } = stage();
    world.style.setProperty('--px', '0.5');
    const { unmount } = renderHook(() => useStageParallax({ current: root }, false));

    expect(world.style.getPropertyValue('--px')).toBe('');
    expect(media.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  it('skips a stage that has no size yet', () => {
    stubMotion(false);
    const { root, world } = stage();
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    renderHook(() => useStageParallax({ current: root }, false));

    window.dispatchEvent(pointer('mouse', 10, 10));
    nextFrame();

    expect(world.style.getPropertyValue('--px')).toBe('');
  });
});
