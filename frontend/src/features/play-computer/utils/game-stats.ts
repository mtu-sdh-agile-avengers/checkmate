import type { PieceKind } from '@/components/chess/stage-art';

export type Side = 'white' | 'black';

/** One side's pieces: how many are left, what they are worth, and which the other side took. */
export type SideStats = { pieces: number; material: number; lost: PieceKind[] };

/** The live statistics of a game, read from its position (FEN) and the number of moves played. */
export type GameStats = {
  fullMoves: number; // the move number, as a score sheet counts it
  halfMoves: number; // every move by either side (plies)
  white: SideStats;
  black: SideStats;
  advantage: { side: Side | null; points: number }; // null: material is level
};

/** The usual piece values, in pawns. */
export const PIECE_VALUES: Record<PieceKind, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const START: Record<PieceKind, number> = { pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1, king: 1 };
const KINDS: Record<string, PieceKind> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
/** Most valuable first, as captured pieces are usually listed. */
const ORDER: PieceKind[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * A position for counting repetitions: the FEN without its two move counters (placement, side
 * to move, castling rights, en passant), as the threefold repetition rule compares positions.
 */
export const positionKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** Reads the statistics from a position. `halfMoves` is the number of moves played so far. */
export function readGameStats(fen: string, halfMoves: number): GameStats {
  const [placement = '', , , , , fullmove = '1'] = fen.split(' ');
  const counts: Record<Side, Record<PieceKind, number>> = { white: emptyCounts(), black: emptyCounts() };
  for (const char of placement) {
    const kind = KINDS[char.toLowerCase()];
    if (kind) counts[char === char.toUpperCase() ? 'white' : 'black'][kind] += 1;
  }
  const white = sideStats(counts.white);
  const black = sideStats(counts.black);
  const difference = white.material - black.material;
  return {
    fullMoves: Number(fullmove) || 1,
    halfMoves,
    white,
    black,
    advantage: { side: difference > 0 ? 'white' : difference < 0 ? 'black' : null, points: Math.abs(difference) },
  };
}

function emptyCounts(): Record<PieceKind, number> {
  return { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 };
}

function sideStats(counts: Record<PieceKind, number>): SideStats {
  // A promoted pawn shows up as an extra queen (or other piece): it was not taken.
  const promoted = ORDER.reduce((sum, kind) => (kind === 'pawn' ? sum : sum + Math.max(0, counts[kind] - START[kind])), 0);
  const lost: PieceKind[] = [];
  for (const kind of ORDER) {
    const missing = Math.max(0, START[kind] - counts[kind]) - (kind === 'pawn' ? promoted : 0);
    for (let index = 0; index < missing; index += 1) lost.push(kind);
  }
  return {
    pieces: Object.values(counts).reduce((sum, count) => sum + count, 0),
    material: ORDER.reduce((sum, kind) => sum + counts[kind] * PIECE_VALUES[kind], 0),
    lost,
  };
}
