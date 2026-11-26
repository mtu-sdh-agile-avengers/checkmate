import type { CSSProperties } from 'react';
import { readPlacement, START_PLACEMENT } from './placement';
import { PieceArt } from './stage-art';
import './top-down-board.css';

/** Makes the board playable: every square becomes a button (In-Game Chess). */
export type BoardInteraction = {
  onSquare: (square: string) => void;
  selected?: string | null; // square of the piece picked up
  targets?: readonly string[]; // where that piece can go
  lastMove?: { from: string; to: string } | null; // highlighted after each move
};

const PIECE_NAMES = { ivory: 'white', ebony: 'black' } as const;

/**
 * The chess board on the tabletop, seen from above and sized by the `--board` custom property.
 * It draws a position (`placement`, the start position by default). The statistics television
 * uses it too, for the final position of a game.
 *
 * With `interaction` the squares are buttons (labelled "e2, white pawn") and show the picked
 * piece, where it can go and the last move; the game logic stays with the caller.
 *
 * `orientation` is the side at the bottom: White by default, Black turns the board round.
 */
export function TopDownBoard({ placement = START_PLACEMENT, label, orientation = 'white', interaction }: {
  placement?: string;
  label: string;
  orientation?: 'white' | 'black';
  interaction?: BoardInteraction;
}) {
  const flipped = orientation === 'black';
  const squares = flipped ? readPlacement(placement).reverse() : readPlacement(placement);
  // Coordinates go along the bottom edge and up the left edge, whichever side is at the bottom.
  const bottomRank = flipped ? '8' : '1';
  const leftFile = flipped ? 'h' : 'a';
  let pieces = 0;
  return (
    <div
      className="td-board"
      role={interaction ? 'group' : 'img'}
      aria-label={label}
      data-placement={placement}
      data-interactive={interaction ? true : undefined}
    >
      {squares.map(({ square, light, piece }) => {
        const content = (
          <>
            {square[1] === bottomRank && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
            {square[0] === leftFile && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
            {piece && (
              // --i staggers the pieces being set out once the camera has settled.
              <span className="td-board__piece" data-square={square} style={{ '--i': pieces++ } as CSSProperties}>
                <PieceArt kind={piece.kind} tone={piece.tone} />
              </span>
            )}
          </>
        );
        if (!interaction) {
          return <div key={square} className="td-board__square" data-light={light}>{content}</div>;
        }
        const selected = interaction.selected === square;
        const target = interaction.targets?.includes(square) ?? false;
        const last = interaction.lastMove?.from === square || interaction.lastMove?.to === square;
        return (
          <button
            key={square}
            type="button"
            className="td-board__square"
            data-light={light}
            data-selected={selected || undefined}
            data-target={target || undefined}
            data-last={last || undefined}
            aria-pressed={selected}
            aria-label={`${square}${piece ? `, ${PIECE_NAMES[piece.tone]} ${piece.kind}` : ''}${target ? ', move here' : ''}`}
            onClick={() => interaction.onSquare(square)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
