import type { PieceKind } from '@/components/chess/stage-art';

export type Side = 'white' | 'black';

/** A piece on the table. Its `id` stays with it for the whole game, so the board can slide it. */
export type BoardPiece = { id: string; kind: PieceKind; side: Side; square: string; taken: boolean };

/** One move as played: which piece, from where to where, and the piece it took, if any. */
export type PlayedMove = { id: string; side: Side; from: string; to: string; taken: string | null };

/**
 * The games played at the Deliberation table while two players are compared: short, real
 * games (famous miniatures, every move legal), in coordinate notation, played one after
 * another. To add one, list its moves from the starting position as from-square + to-square.
 */
export const RAPID_GAMES: readonly (readonly string[])[] = [
  // Scholar's mate: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
  ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'],
  // Légal's mate: 1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#
  ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'],
  // Fool's mate: 1. f3 e5 2. g4 Qh4#
  ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
  // Blackburne Shilling trap: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4', 'f3e5', 'd8g5', 'e5f7', 'g5g2', 'h1f1', 'g2e4', 'c4e2', 'd4f3'],
];

const FILES = 'abcdefgh';
const BACK_RANK: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

/** The 32 pieces on their starting squares. */
export function startingPieces(): BoardPiece[] {
  const pieces: BoardPiece[] = [];
  for (const side of ['white', 'black'] as const) {
    const [back, front] = side === 'white' ? ['1', '2'] : ['8', '7'];
    BACK_RANK.forEach((kind, index) => {
      const file = FILES.charAt(index);
      pieces.push({ id: `${side}-${kind}-${file}`, kind, side, square: `${file}${back}`, taken: false });
      pieces.push({ id: `${side}-pawn-${file}`, kind: 'pawn', side, square: `${file}${front}`, taken: false });
    });
  }
  return pieces;
}

/**
 * Plays one move (e.g. "e2e4"): the piece on the first square goes to the second and takes
 * whatever stands there (or, for a pawn moving diagonally to an empty square, the pawn it
 * passed: en passant). A king moving two files castles, so its rook comes across too.
 * Display only: the moves are trusted to be legal, but a move from an empty square or onto
 * the mover's own piece is refused, so a mistyped game fails loudly.
 */
export function playMove(pieces: readonly BoardPiece[], uci: string): { pieces: BoardPiece[]; move: PlayedMove } {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const mover = pieces.find((piece) => !piece.taken && piece.square === from);
  if (!mover) throw new Error(`No piece on ${from} for ${uci}.`);

  let target = pieces.find((piece) => !piece.taken && piece.square === to) ?? null;
  if (target?.side === mover.side) throw new Error(`${uci} lands on its own piece.`);
  if (!target && mover.kind === 'pawn' && from.charAt(0) !== to.charAt(0)) {
    target = pieces.find((piece) => !piece.taken && piece.square === `${to.charAt(0)}${from.charAt(1)}`) ?? null;
  }

  let rook: { id: string; to: string } | null = null;
  if (mover.kind === 'king' && Math.abs(FILES.indexOf(from.charAt(0)) - FILES.indexOf(to.charAt(0))) === 2) {
    const kingside = to.charAt(0) === 'g';
    const rank = from.charAt(1);
    const corner = pieces.find((piece) => !piece.taken && piece.square === `${kingside ? 'h' : 'a'}${rank}`);
    if (corner) rook = { id: corner.id, to: `${kingside ? 'f' : 'd'}${rank}` };
  }

  const next = pieces.map((piece) => {
    if (piece.id === mover.id) return { ...piece, square: to };
    if (piece.id === target?.id) return { ...piece, taken: true };
    if (piece.id === rook?.id) return { ...piece, square: rook.to };
    return piece;
  });
  return { pieces: next, move: { id: mover.id, side: mover.side, from, to, taken: target?.id ?? null } };
}
