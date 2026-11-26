import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameBoard } from '@/features/play-computer/components/game-board';
import { replayMoves } from '@/features/play-computer/utils/board-replay';
import { dragPiece, pointer, stubHitTest } from '@/testing/pointer';

const FIRST_MOVES = ['e2e3', 'e2e4', 'g1f3', 'g1h3', 'b1c3', 'b1a3'];

function renderBoard(overrides: Partial<Parameters<typeof GameBoard>[0]> = {}) {
  const { pieces, takenAt } = replayMoves([]);
  const props = {
    pieces,
    takenAt,
    plies: 0,
    label: 'Board for your game',
    legalMoves: FIRST_MOVES,
    playable: true,
    selected: null,
    lastMove: null,
    checkSquare: null,
    onSquare: vi.fn(),
    onPick: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  };
  const view = render(<GameBoard {...props} />);
  return { ...view, props };
}

afterEach(() => stubHitTest(null));

describe('game board', () => {
  it('labels every square, the piece on it and what it can do', () => {
    renderBoard({ selected: 'e2', legalMoves: FIRST_MOVES, checkSquare: 'e1', lastMove: { from: 'e7', to: 'e5' } });
    expect(screen.getByRole('group', { name: 'Board for your game' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(64);
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'e4, move here' })).toHaveAttribute('data-target', 'true');
    expect(screen.getByRole('button', { name: 'e1, white king, in check' })).toHaveAttribute('data-check', 'true');
    expect(screen.getByRole('button', { name: 'e5' })).toHaveAttribute('data-last', 'true');
    expect(screen.getByRole('button', { name: 'g1, white knight' })).toHaveAttribute('data-draggable', 'true');
    expect(screen.getByRole('button', { name: 'e7, black pawn' })).not.toHaveAttribute('data-draggable');
  });

  it('moves a piece dragged to a square, and passes a click on', async () => {
    const user = userEvent.setup();
    const { props } = renderBoard();
    const from = screen.getByRole('button', { name: 'e2, white pawn' });
    const to = screen.getByRole('button', { name: 'e4' });

    dragPiece(from, to);

    expect(props.onPick).toHaveBeenCalledWith('e2');
    expect(props.onDrop).toHaveBeenCalledWith('e2', 'e4');
    expect(props.onSquare).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'g1, white knight' }));
    expect(props.onSquare).toHaveBeenCalledWith('g1');
  });

  it('lifts the piece in hand and lights the target under it', () => {
    const { container } = renderBoard({ selected: 'e2' });
    const from = screen.getByRole('button', { name: 'e2, white pawn' });
    const to = screen.getByRole('button', { name: 'e4, move here' });

    stubHitTest(to);
    pointer(from, 'pointerdown', 100, 300);
    pointer(from, 'pointermove', 104, 296); // not far enough yet
    expect(container.querySelector('[data-dragging]')).toBeNull();
    pointer(from, 'pointermove', 100, 200);

    const piece = container.querySelector<HTMLElement>('[data-piece-id="white-pawn-e"]');
    expect(piece).toHaveAttribute('data-dragging', 'true');
    expect(piece?.style.getPropertyValue('--dy')).toBe('-100px');
    expect(to).toHaveAttribute('data-over', 'true');

    pointer(from, 'pointercancel', 100, 200);
    expect(piece).not.toHaveAttribute('data-dragging');
    expect(piece?.style.getPropertyValue('--dy')).toBe('');
  });

  it('drops off the board as nowhere, and lets a cancelled drag go home', () => {
    const { props } = renderBoard();
    const from = screen.getByRole('button', { name: 'g1, white knight' });

    stubHitTest(null);
    pointer(from, 'pointerdown', 10, 10);
    pointer(from, 'pointermove', 60, 90);
    pointer(from, 'pointerup', 60, 90);
    expect(props.onDrop).toHaveBeenLastCalledWith('g1', null);

    pointer(from, 'pointerdown', 10, 10);
    pointer(from, 'pointermove', 60, 90);
    pointer(from, 'pointercancel', 60, 90);
    expect(props.onDrop).toHaveBeenLastCalledWith('g1', null);
  });

  it('does not pick up the computer’s pieces, pieces without a move, or anything out of turn', () => {
    const { props, rerender } = renderBoard();
    dragPiece(screen.getByRole('button', { name: 'e7, black pawn' }), screen.getByRole('button', { name: 'e5' }));
    dragPiece(screen.getByRole('button', { name: 'a1, white rook' }), screen.getByRole('button', { name: 'a3' }));
    // a press with another button, or a pointer the board is not following
    pointer(screen.getByRole('button', { name: 'e2, white pawn' }), 'pointerdown', 0, 0, { button: 2 });
    pointer(screen.getByRole('button', { name: 'e2, white pawn' }), 'pointermove', 50, 50, { pointerId: 9 });
    pointer(screen.getByRole('button', { name: 'e2, white pawn' }), 'pointerup', 50, 50, { pointerId: 9 });
    expect(props.onDrop).not.toHaveBeenCalled();

    rerender(<GameBoard {...props} playable={false} />);
    dragPiece(screen.getByRole('button', { name: 'e2, white pawn' }), screen.getByRole('button', { name: 'e4' }));
    expect(props.onPick).not.toHaveBeenCalled();
    expect(props.onDrop).not.toHaveBeenCalled();
  });

  it('lets a just-taken piece fade where it stood, and keeps older captures off the board', () => {
    const moves = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5'];
    const { pieces, takenAt } = replayMoves(moves.slice(0, 4));
    const { container, rerender, props } = renderBoard({ pieces, takenAt, plies: 4 });
    expect(container.querySelector('[data-piece-id="black-pawn-d"]')).toHaveAttribute('data-taken', 'true');
    expect(container.querySelector('[data-piece-id="white-pawn-e"]')).toHaveAttribute('data-taken', 'true');

    const later = replayMoves(moves);
    rerender(<GameBoard {...props} pieces={later.pieces} takenAt={later.takenAt} plies={6} lastMove={{ from: 'd5', to: 'a5' }} />);
    expect(container.querySelector('[data-piece-id="black-pawn-d"]')).toBeNull();
    expect(container.querySelector('[data-piece-id="black-queen-d"]')).toHaveAttribute('data-moving', 'true');
  });
});
