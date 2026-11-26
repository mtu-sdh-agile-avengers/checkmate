import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { BoardPiece } from '@/components/chess/board-pieces';
import { readPlacement } from '@/components/chess/placement';
import { PieceArt } from '@/components/chess/stage-art';
import { targetsFrom } from '@/features/play-computer/utils/moves';
import '@/components/chess/top-down-board.css';
import './game-board.css';

const FILES = 'abcdefgh';
const SQUARES = readPlacement('8/8/8/8/8/8/8/8');
const NAMES = { white: 'white', black: 'black' } as const;
/** How far (px) a pointer moves before a press on a piece becomes a drag. */
const DRAG_START_PX = 6;

/** A press on one of the player's pieces, which becomes a drag once the pointer moves. */
type Press = { pointerId: number; from: string; id: string; x: number; y: number; dragging: boolean };

/**
 * The board of a game against the computer: the same table-top board as TopDownBoard (squares,
 * frame, coordinates), with the pieces on a layer of their own so they can move.
 *
 * - Every square is a button ("e2, white pawn", ", move here", ", in check"), so the board is
 *   played by keyboard or click: the piece, then where it goes (`onSquare`).
 * - The player's pieces can also be dragged, with a mouse, a pen or a finger (pointer events),
 *   while it is their turn (`playable`): `onPick` when the drag starts (the targets light up),
 *   `onDrop` when it ends, with the square under the pointer (null off the board). A refused
 *   drop needs nothing more: the piece slides back from where it was let go.
 * - Each piece keeps its element from move to move (`pieces`, by id), so a move is a slide,
 *   for the player's moves and the computer's, the castling rook included; a piece taken in
 *   the last two moves (`takenAt`) shrinks and fades. The layer takes no clicks, so nothing
 *   waits for an animation (game-board.css).
 */
export function GameBoard({ pieces, takenAt, plies, label, legalMoves, playable, selected, lastMove, checkSquare, onSquare, onPick, onDrop }: {
  pieces: readonly BoardPiece[];
  takenAt: ReadonlyMap<string, number>;
  plies: number; // moves played, to tell which captures are recent
  label: string;
  legalMoves: readonly string[];
  playable: boolean;
  selected: string | null;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  onSquare: (square: string) => void;
  onPick: (square: string) => void;
  onDrop: (from: string, to: string | null) => void;
}) {
  const board = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const skipClick = useRef(false);
  const released = useRef<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // A piece let go: its offset goes in the same commit that gives it its transition back (and
  // its new square, if the move is played), so it slides from where it was dropped. Dropping
  // the offset straight away would let a style read in between snap it home without a slide.
  useLayoutEffect(() => {
    if (dragged !== null || released.current === null) return;
    const element = board.current?.querySelector<HTMLElement>(`[data-piece-id="${released.current}"]`);
    element?.style.removeProperty('--dx');
    element?.style.removeProperty('--dy');
    released.current = null;
  }, [dragged]);

  const standing = new Map(pieces.filter((piece) => !piece.taken).map((piece) => [piece.square, piece]));
  const targets = selected ? targetsFrom(legalMoves, selected) : [];
  const movable = (square: string) => playable && standing.get(square)?.side === 'white' && targetsFrom(legalMoves, square).length > 0;
  const lastId = lastMove ? standing.get(lastMove.to)?.id : undefined;

  const squareAt = (x: number, y: number): string | null => {
    if (typeof document.elementFromPoint !== 'function') return null;
    return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-square]')?.dataset.square ?? null;
  };
  const pieceElement = (id: string) => board.current?.querySelector<HTMLElement>(`[data-piece-id="${id}"]`);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    skipClick.current = false;
    if (event.button !== 0) return;
    const square = (event.target as Element).closest<HTMLElement>('[data-square]')?.dataset.square;
    const piece = square ? standing.get(square) : undefined;
    if (!square || !piece || !movable(square)) return;
    // No pointer capture yet: a captured pointer's click goes to the board, not to the square,
    // and a plain click must still pick the piece up (click-to-move).
    press.current = { pointerId: event.pointerId, from: square, id: piece.id, x: event.clientX, y: event.clientY, dragging: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.dragging) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      current.dragging = true;
      setDragged(current.id);
      onPick(current.from);
      // Now it is a drag: keep the pointer's events coming here, even off the board.
      const element = board.current;
      try {
        if (element && typeof element.setPointerCapture === 'function') element.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser no longer tracks: the drag goes on without capture.
      }
    }
    // The dragged piece follows the pointer: set directly, not through React, at pointer speed.
    pieceElement(current.id)?.style.setProperty('--dx', `${dx}px`);
    pieceElement(current.id)?.style.setProperty('--dy', `${dy}px`);
    const hovered = squareAt(event.clientX, event.clientY);
    if (hovered !== over) setOver(hovered);
  };

  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    press.current = null;
    if (!current.dragging) return; // a plain press: the click that follows does the rest
    // The click this release may fire on the square is not a second move.
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    const to = cancelled ? null : squareAt(event.clientX, event.clientY);
    // Let go: the piece slides from where it was dropped to its square, the new one if the move
    // is played, back where it came from if not (the offset goes in the layout effect above).
    released.current = current.id;
    setDragged(null);
    setOver(null);
    onDrop(current.from, to);
  };

  return (
    <div
      ref={board}
      className="td-board game-board"
      role="group"
      aria-label={label}
      data-interactive
      data-dragging={dragged ? true : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
    >
      {SQUARES.map(({ square, light }) => {
        const piece = standing.get(square);
        const target = targets.includes(square);
        return (
          <button
            key={square}
            type="button"
            className="td-board__square"
            data-square={square}
            data-light={light}
            data-occupied={piece ? true : undefined}
            data-draggable={movable(square) || undefined}
            data-selected={selected === square || undefined}
            data-target={target || undefined}
            data-over={over === square && target ? true : undefined}
            data-last={lastMove?.from === square || lastMove?.to === square || undefined}
            data-check={checkSquare === square || undefined}
            aria-pressed={selected === square}
            aria-label={`${square}${piece ? `, ${NAMES[piece.side]} ${piece.kind}` : ''}${target ? ', move here' : ''}${checkSquare === square ? ', in check' : ''}`}
            onClick={() => {
              if (!skipClick.current) onSquare(square);
            }}
          >
            {square[1] === '1' && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
            {square[0] === 'a' && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
          </button>
        );
      })}
      <div className="game-board__pieces" aria-hidden="true">
        {pieces
          .filter((piece) => !piece.taken || (takenAt.get(piece.id) ?? -1) >= plies - 2)
          .map((piece) => (
            <span
              key={piece.id}
              className="game-board__piece"
              data-piece-id={piece.id}
              data-tone={piece.side === 'white' ? 'ivory' : 'ebony'}
              data-taken={piece.taken || undefined}
              data-moving={piece.id === lastId || undefined}
              data-dragging={piece.id === dragged || undefined}
              style={{ '--file': FILES.indexOf(piece.square.charAt(0)), '--row': 8 - Number(piece.square.charAt(1)) } as CSSProperties}
            >
              <i className="game-board__shadow" />
              <span className="game-board__art"><PieceArt kind={piece.kind} tone={piece.side === 'white' ? 'ivory' : 'ebony'} /></span>
            </span>
          ))}
      </div>
    </div>
  );
}
