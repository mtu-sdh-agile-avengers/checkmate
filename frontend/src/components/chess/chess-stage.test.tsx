import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ChessStage } from './chess-stage';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup(reduced = false) {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  return render(<ChessStage />);
}

it('describes the scene, flickers its televisions and can be paused', () => {
  const { container, unmount } = setup();
  expect(screen.getByRole('img', { name: /chessboard floor.*empty chair/i })).toBeInTheDocument();
  expect(container.querySelectorAll('.stage-tv .crt-face')).toHaveLength(14);
  expect(container.querySelectorAll('.stage-piece')).toHaveLength(6);
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(0);
  act(() => { vi.advanceTimersByTime(4000); });
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(14);
  fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
  expect(screen.getByRole('button', { name: 'Play animation' })).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.chess-stage')).toHaveAttribute('data-paused', 'true');
  expect(vi.getTimerCount()).toBe(0);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('holds a still frame when reduced motion is requested', () => {
  const { container } = setup(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(4);
  act(() => { vi.advanceTimersByTime(30000); });
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(4);
});
