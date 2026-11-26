import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RAPID_GAMES } from '@/features/deliberation/utils/rapid-games';
import { useRapidGames } from './use-rapid-games';

const PLY = 300;

describe('rapid games hook', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays a move every ply, holds the game's end, then sends the pieces home for the next game", () => {
    const { result } = renderHook(() => useRapidGames(true, PLY, false));
    expect(result.current).toMatchObject({ game: 0, ply: 0, move: null });

    act(() => vi.advanceTimersByTime(PLY));
    expect(result.current.move).toMatchObject({ side: 'white', from: 'e2', to: 'e4' });
    expect(result.current.moves).toBe(1);

    const length = RAPID_GAMES[0]?.length ?? 0;
    act(() => vi.advanceTimersByTime(PLY * (length - 1)));
    expect(result.current.ply).toBe(length);
    // The last position holds for two plies, then the next game starts from the start.
    act(() => vi.advanceTimersByTime(PLY * 2));
    expect(result.current.move).toBeNull();
    act(() => vi.advanceTimersByTime(PLY));
    expect(result.current).toMatchObject({ game: 1, ply: 0 });
    expect(result.current.pieces.find((piece) => piece.id === 'white-pawn-e')?.square).toBe('e2');
  });

  it('freezes when it stops, starts the next game when it plays again, and plays nothing still', () => {
    const { result, rerender } = renderHook(({ playing }) => useRapidGames(playing, PLY, false), { initialProps: { playing: true } });
    act(() => vi.advanceTimersByTime(PLY * 3));
    rerender({ playing: false });
    const frozen = result.current.pieces;
    act(() => vi.advanceTimersByTime(PLY * 10));
    expect(result.current.pieces).toBe(frozen);

    rerender({ playing: true });
    expect(result.current).toMatchObject({ game: 1, ply: 0 });

    const still = renderHook(() => useRapidGames(true, PLY, true));
    act(() => vi.advanceTimersByTime(PLY * 10));
    expect(still.result.current.moves).toBe(0);
  });
});
