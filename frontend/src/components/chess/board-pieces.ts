import type { PieceKind } from './stage-art';

export type Side = 'white' | 'black';

/** A piece on a board. Its `id` stays with it for the whole game, so a board can slide it. */
export type BoardPiece = { id: string; kind: PieceKind; side: Side; square: string; taken: boolean };

/** One move as played: which piece, from where to where, and the piece it took, if any. */
export type PlayedMove = { id: string; side: Side; from: string; to: string; taken: string | null };

const FILES = 'abcdefgh';
const BACK_RANK: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
const PROMOTIONS: Record<string, PieceKind> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };

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
 * Plays one move in coordinate notation (e.g. "e2e4", "e7e8q"): the piece on the first square
 * goes to the second and takes whatever stands there (or, for a pawn moving diagonally to an
 * empty square, the pawn it passed: en passant). A king moving two files castles, so its rook
 * comes across too; a fifth letter promotes the pawn (q, r, b or n), which keeps its id.
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
  const promoted = mover.kind === 'pawn' ? PROMOTIONS[uci.charAt(4)] : undefined;

  const next = pieces.map((piece) => {
    if (piece.id === mover.id) return { ...piece, square: to, kind: promoted ?? piece.kind };
    if (piece.id === target?.id) return { ...piece, taken: true };
    if (piece.id === rook?.id) return { ...piece, square: rook.to };
    return piece;
  });
  return { pieces: next, move: { id: mover.id, side: mover.side, from, to, taken: target?.id ?? null } };
}
