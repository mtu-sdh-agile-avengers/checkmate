import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readPlacement, START_PLACEMENT } from './placement';
import { TopDownBoard } from './top-down-board';

describe('top-down board', () => {
  it('reads a placement into 64 squares, a8 first', () => {
    const squares = readPlacement(START_PLACEMENT);
    expect(squares).toHaveLength(64);
    expect(squares.filter((square) => square.piece)).toHaveLength(32);
    expect(squares[0]).toEqual({ square: 'a8', light: true, piece: { kind: 'rook', tone: 'ebony' } });
    expect(squares.find((square) => square.square === 'e1')).toEqual({ square: 'e1', light: false, piece: { kind: 'king', tone: 'ivory' } });
    expect(squares.find((square) => square.square === 'd1')?.light).toBe(true); // the queen on her colour
    expect(squares.find((square) => square.square === 'a1')?.light).toBe(false);
  });

  it('accepts a full FEN string and refuses a broken placement', () => {
    const afterE4 = readPlacement('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(afterE4.find((square) => square.square === 'e4')?.piece).toEqual({ kind: 'pawn', tone: 'ivory' });
    expect(afterE4.find((square) => square.square === 'e2')?.piece).toBeNull();
    expect(() => readPlacement('8/8/8')).toThrow(/8 ranks/);
    expect(() => readPlacement('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN')).toThrow(/rank 1/i);
    expect(() => readPlacement('xnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toThrow(/rank 8/i);
  });

  it('draws the position as one labelled picture', () => {
    const { container } = render(<TopDownBoard label="Chess board, starting position" />);
    expect(screen.getByRole('img', { name: 'Chess board, starting position' })).toBeInTheDocument();
    expect(container.querySelectorAll('.td-board__square')).toHaveLength(64);
    expect(container.querySelectorAll('.td-board__piece')).toHaveLength(32);
  });
});
