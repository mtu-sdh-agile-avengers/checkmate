import type { CSSProperties } from 'react';
import { readPlacement, START_PLACEMENT } from './placement';
import { PieceArt } from './stage-art';
import './top-down-board.css';

/**
 * The chess board on the tabletop, seen from above and sized by the `--board` custom property.
 * For now it only draws a position (`placement`, the start position by default): there is no
 * game behind it yet. The game engine will supply the placement as the game goes on.
 */
export function TopDownBoard({ placement = START_PLACEMENT, label }: { placement?: string; label: string }) {
  const squares = readPlacement(placement);
  let pieces = 0;
  return (
    <div className="td-board" role="img" aria-label={label} data-placement={placement}>
      {squares.map(({ square, light, piece }) => (
        <div key={square} className="td-board__square" data-light={light}>
          {square[1] === '1' && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
          {square[0] === 'a' && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
          {piece && (
            // --i staggers the pieces being set out once the camera has settled.
            <span className="td-board__piece" data-square={square} style={{ '--i': pieces++ } as CSSProperties}>
              <PieceArt kind={piece.kind} tone={piece.tone} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
