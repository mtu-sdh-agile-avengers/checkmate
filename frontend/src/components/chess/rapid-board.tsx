import type { CSSProperties } from 'react';
import { readPlacement } from './placement';
import { PieceArt, type PieceKind, type PieceTone } from './stage-art';
import './top-down-board.css';
import './rapid-board.css';

/** A piece as the board draws it: what, in which tone, where, and whether it has been taken. */
export type RapidPiece = { id: string; kind: PieceKind; tone: PieceTone; square: string; taken: boolean };

const FILES = 'abcdefgh';
const SQUARES = readPlacement('8/8/8/8/8/8/8/8');

/**
 * A top-down board whose pieces move: each piece keeps its element from move to move (by
 * `id`), so when its square changes it slides there instead of reappearing. The piece named
 * by `hop` hops on its way, up towards the camera, its contact shadow left behind; `hop.count`
 * restarts the hop for every move. A piece `taken` is knocked off the board, spinning away.
 * Same board as TopDownBoard (squares, frame, coordinates); sized by `--board`, timed by
 * `--ply-ms`. All movement is transform and opacity (rapid-board.css).
 */
export function RapidBoard({ pieces, hop, label }: {
  pieces: readonly RapidPiece[];
  hop: { id: string; count: number } | null;
  label: string;
}) {
  return (
    <div className="td-board rapid-board" role="img" aria-label={label}>
      {SQUARES.map(({ square, light }) => (
        <div key={square} className="td-board__square" data-light={light}>
          {square[1] === '1' && <span className="td-board__file" aria-hidden="true">{square[0]}</span>}
          {square[0] === 'a' && <span className="td-board__rank" aria-hidden="true">{square[1]}</span>}
        </div>
      ))}
      <div className="rapid-board__pieces" aria-hidden="true">
        {pieces.map((piece) => {
          const position = { '--file': FILES.indexOf(piece.square.charAt(0)), '--row': 8 - Number(piece.square.charAt(1)) } as CSSProperties;
          const hopping = hop !== null && hop.id === piece.id;
          return (
            <span
              key={piece.id}
              className="rapid-board__piece"
              data-tone={piece.tone}
              data-taken={piece.taken || undefined}
              data-hop={hopping ? (hop.count % 2 === 0 ? 'a' : 'b') : undefined}
              style={position}
            >
              <i className="rapid-board__shadow" />
              <span className="rapid-board__art"><PieceArt kind={piece.kind} tone={piece.tone} /></span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
