import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CrtPyramid } from './crt-pyramid';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('shows twenty-four sets on static, cuts them to pictures and exposes a pause control', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { container, unmount } = render(<CrtPyramid />);
  expect(container.querySelectorAll('.crt-face')).toHaveLength(24);
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(0);
  act(() => { vi.advanceTimersByTime(4000); });
  expect(container.querySelectorAll('[data-active="true"][data-revealed="true"]')).toHaveLength(24);
  fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
  expect(screen.getByRole('button', { name: 'Play animation' })).toHaveAttribute('aria-pressed', 'true');
  expect(vi.getTimerCount()).toBe(0);
  act(() => { vi.advanceTimersByTime(30000); });
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(24);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
