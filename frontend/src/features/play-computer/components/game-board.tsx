import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { BoardPiece } from '@/components/chess/board-pieces';
import { readPlacement } from '@/components/chess/placement';
import { PieceArt } from '@/components/chess/stage-art';
import { targetsFrom } from '@/features/play-computer/utils/moves';
import { MARKS, type Mark } from '@/features/play-computer/utils/review';
import '@/components/chess/top-down-board.css';
import './game-board.css';

const FILES = 'abcdefgh';
const SQUARES = readPlacement('8/8/8/8/8/8/8/8');
const NAMES = { white: 'white', black: 'black' } as const;
/** How far (px) a pointer moves before a press on a piece becomes a drag. */
const DRAG_START_PX = 6;

/** A press on one of the player's pieces, which becomes a drag once the pointer moves. */
type Press = { pointerId: number; from: string; id: string; x: number; y: number; dragging: boolean };

/** Where a square is on the board: its file (0 = a) and row from the top (0 = rank 8). */
const placeOf = (square: string) => ({ file: FILES.indexOf(square.charAt(0)), row: 8 - Number(square.charAt(1)) });

/** An arrow from the middle of one square to the next, in squares (the board is 8 by 8):
 *  the shaft starts a little off the first square's centre and stops at the head. */
function arrowShape(from: string, to: string): { shaft: string; head: string } {
  const a = placeOf(from);
  const b = placeOf(to);
  const [x1, y1, x2, y2] = [a.file + 0.5, a.row + 0.5, b.file + 0.5, b.row + 0.5];
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length];
  const [headLength, halfWidth] = [0.42, 0.24];
  const [bx, by] = [x2 - ux * headLength, y2 - uy * headLength];
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    shaft: `M${round(x1 + ux * 0.2)} ${round(y1 + uy * 0.2)}L${round(bx)} ${round(by)}`,
    head: [[x2, y2], [bx - uy * halfWidth, by + ux * halfWidth], [bx + uy * halfWidth, by - ux * halfWidth]]
      .map(([x, y]) => `${round(x ?? 0)},${round(y ?? 0)}`)
      .join(' '),
  };
}

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
 * - `readOnly` (the review): a picture of the position, nothing to press; `marker` flags the
 *   move that led to it on its square (?? blunder, ? mistake, ?! inaccuracy) and `arrow` draws
 *   the engine's better move, from its square to its target.
 */
export function GameBoard({ pieces, takenAt, plies, label, legalMoves = [], playable, selected = null, lastMove, checkSquare, onSquare, onPick, onDrop, readOnly = false, marker = null, arrow = null }: {
  pieces: readonly BoardPiece[];
  takenAt: ReadonlyMap<string, number>;
  plies: number; // moves played, to tell which captures are recent
  label: string;
  legalMoves?: readonly string[];
  playable: boolean;
  selected?: string | null;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  onSquare?: (square: string) => void;
  onPick?: (square: string) => void;
  onDrop?: (from: string, to: string | null) => void;
  readOnly?: boolean;
  marker?: { square: string; mark: Mark } | null;
  arrow?: { from: string; to: string } | null;
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

  /**
   * Ends the press in hand, whichever pointer it was: a drag is let go of at (x, y), or
   * anywhere at all when `cancelled` (then the piece slides back where it came from).
   */
  const endPress = (x: number, y: number, cancelled: boolean) => {
    const current = press.current;
    press.current = null;
    if (!current?.dragging) return; // a plain press: the click that follows does the rest
    // The click this release may fire on the square is not a second move.
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    const to = cancelled ? null : squareAt(x, y);
    // Let go: the piece slides from where it was dropped to its square, the new one if the move
    // is played, back where it came from if not (the offset goes in the layout effect above).
    released.current = current.id;
    setDragged(null);
    setOver(null);
    onDrop?.(current.from, to);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Never carry a press over: one the board never heard released (let go off the board
    // before it became a drag, or a drag that could not capture the pointer) ends here, and a
    // piece left in hand goes home. Even a press that picks nothing up ends it.
    endPress(event.clientX, event.clientY, true);
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
    // No button held: the press was released somewhere the board did not hear about (a mouse
    // keeps pointer id 1, so a later hover would otherwise pick the old press up again).
    if (event.buttons === 0) {
      endPress(event.clientX, event.clientY, true);
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.dragging) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      current.dragging = true;
      setDragged(current.id);
      onPick?.(current.from);
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
    if (press.current?.pointerId !== event.pointerId) return;
    endPress(event.clientX, event.clientY, cancelled);
  };

  const shape = arrow ? arrowShape(arrow.from, arrow.to) : null;
  const markerAt = marker ? placeOf(marker.square) : null;

  if (readOnly) {
    return (
      <div className="td-board game-board" role="img" aria-label={label} data-interactive data-read-only>
        {SQUARES.map(({ square, light }) => (
          <span
            key={square}
            className="td-board__square"
            data-square={square}
            data-light={light}
            data-last={lastMove?.from === square || lastMove?.to === square || undefined}
            data-check={checkSquare === square || undefined}
          >
            {square[1] === '1' && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
            {square[0] === 'a' && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
          </span>
        ))}
        {renderPieces(pieces, takenAt, plies, lastId, null)}
        {shape && (
          <svg className="game-board__arrow" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
            <path className="game-board__arrow-halo" d={shape.shaft} />
            <polygon className="game-board__arrow-halo" points={shape.head} />
            <path className="game-board__arrow-line" d={shape.shaft} />
            <polygon className="game-board__arrow-head" points={shape.head} />
          </svg>
        )}
        {marker && markerAt && (
          <span
            className="game-board__marker"
            data-mark={marker.mark}
            style={{ '--file': markerAt.file, '--row': markerAt.row } as CSSProperties}
            aria-hidden="true"
          >
            <b>{MARKS[marker.mark].symbol}</b>
          </span>
        )}
      </div>
    );
  }

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
              if (!skipClick.current) onSquare?.(square);
            }}
          >
            {square[1] === '1' && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
            {square[0] === 'a' && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
          </button>
        );
      })}
      {renderPieces(pieces, takenAt, plies, lastId, dragged)}
    </div>
  );
}

/** The pieces' layer: every piece still on the board, and those taken in the last two moves. */
function renderPieces(
  pieces: readonly BoardPiece[],
  takenAt: ReadonlyMap<string, number>,
  plies: number,
  lastId: string | undefined,
  dragged: string | null,
) {
  return (
    <div className="game-board__pieces" aria-hidden="true">
      {pieces
        .filter((piece) => !piece.taken || (takenAt.get(piece.id) ?? -1) >= plies - 2)
        .map((piece) => {
          const { file, row } = placeOf(piece.square);
          return (
            <span
              key={piece.id}
              className="game-board__piece"
              data-piece-id={piece.id}
              data-tone={piece.side === 'white' ? 'ivory' : 'ebony'}
              data-taken={piece.taken || undefined}
              data-moving={piece.id === lastId || undefined}
              data-dragging={piece.id === dragged || undefined}
              style={{ '--file': file, '--row': row } as CSSProperties}
            >
              <i className="game-board__shadow" />
              <span className="game-board__art"><PieceArt kind={piece.kind} tone={piece.side === 'white' ? 'ivory' : 'ebony'} /></span>
            </span>
          );
        })}
    </div>
  );
}
