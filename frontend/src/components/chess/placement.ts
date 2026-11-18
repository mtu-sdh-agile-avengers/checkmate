import type { PieceKind, PieceTone } from './stage-art';

/** Piece placement in FEN notation (the first field of a FEN string), rank 8 first. */
export const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const FILES = 'abcdefgh';
const KINDS: Record<string, PieceKind> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export type BoardSquare = {
  square: string;
  light: boolean;
  piece: { kind: PieceKind; tone: PieceTone } | null;
};

/**
 * Reads a FEN placement into its 64 squares, a8 first (the order the board draws them).
 * A full FEN string is accepted too; only its placement is read. Display only: no chess rules
 * are checked here, that is the engine's job.
 */
export function readPlacement(placement: string): BoardSquare[] {
  const ranks = (placement.trim().split(/\s+/)[0] ?? '').split('/');
  if (ranks.length !== 8) throw new Error(`A placement has 8 ranks, this one has ${ranks.length}.`);
  const squares: BoardSquare[] = [];
  ranks.forEach((rank, row) => {
    let file = 0;
    const at = () => ({ square: `${FILES[file]}${8 - row}`, light: (file + row) % 2 === 0 });
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        for (let gap = Number(char); gap > 0; gap--, file++) squares.push({ ...at(), piece: null });
        continue;
      }
      const kind = KINDS[char.toLowerCase()];
      if (!kind || file > 7) throw new Error(`Rank ${8 - row} of the placement is not valid.`);
      squares.push({ ...at(), piece: { kind, tone: char === char.toUpperCase() ? 'ivory' : 'ebony' } });
      file++;
    }
    if (file !== 8) throw new Error(`Rank ${8 - row} of the placement has ${file} squares instead of 8.`);
  });
  return squares;
}
