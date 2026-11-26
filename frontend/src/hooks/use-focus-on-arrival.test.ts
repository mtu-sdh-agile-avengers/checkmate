import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFocusOnArrival } from './use-focus-on-arrival';

afterEach(() => vi.restoreAllMocks());

describe('focus on arrival', () => {
  it('focuses the element once it can take focus', () => {
    const button = document.createElement('button');
    document.body.append(button);
    let frames = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames += 1;
      callback(0);
      return frames;
    });
    // hidden for the first try (focus does nothing), then visible
    const realFocus = button.focus.bind(button);
    vi.spyOn(button, 'focus')
      .mockImplementationOnce(() => {})
      .mockImplementation(realFocus);

    renderHook(() => useFocusOnArrival({ current: button }));

    expect(document.activeElement).toBe(button);
    expect(frames).toBe(1);
    button.remove();
  });

  it('does nothing when not asked or with no element', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    renderHook(() => useFocusOnArrival({ current: null }));
    renderHook(() => useFocusOnArrival({ current: document.body }, false));
    expect(raf).not.toHaveBeenCalled();
  });
});
