import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RapidBoard, type RapidPiece } from './rapid-board';

const PIECES: RapidPiece[] = [
  { id: 'white-pawn-e', kind: 'pawn', tone: 'ivory', square: 'e4', taken: false },
  { id: 'black-pawn-d', kind: 'pawn', tone: 'ebony', square: 'd5', taken: true },
  { id: 'white-king-e', kind: 'king', tone: 'ivory', square: 'e1', taken: false },
];

describe('rapid board', () => {
  it('draws each piece on its square, the one on the move hopping and a taken one knocked off', () => {
    const { container, rerender } = render(<RapidBoard pieces={PIECES} hop={{ id: 'white-pawn-e', count: 4 }} label="Board" />);
    expect(screen.getByRole('img', { name: 'Board' })).toBeInTheDocument();
    expect(container.querySelectorAll('.td-board__square')).toHaveLength(64);

    const pieces = container.querySelectorAll<HTMLElement>('.rapid-board__piece');
    expect(pieces).toHaveLength(3);
    expect(pieces[0]?.style.getPropertyValue('--file')).toBe('4'); // e
    expect(pieces[0]?.style.getPropertyValue('--row')).toBe('4'); // rank 4, counted from the top
    expect(pieces[0]).toHaveAttribute('data-hop', 'a');
    expect(pieces[1]).toHaveAttribute('data-taken');
    expect(pieces[2]).not.toHaveAttribute('data-hop');

    // The next move restarts the hop under the other keyframes; the same element is kept.
    rerender(<RapidBoard pieces={PIECES} hop={{ id: 'white-pawn-e', count: 5 }} label="Board" />);
    expect(container.querySelectorAll('.rapid-board__piece')[0]).toBe(pieces[0]);
    expect(pieces[0]).toHaveAttribute('data-hop', 'b');
  });
});
