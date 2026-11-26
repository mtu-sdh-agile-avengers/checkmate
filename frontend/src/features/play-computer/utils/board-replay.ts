import { playMove, startingPieces, type BoardPiece } from '@/components/chess/board-pieces';

/** The pieces after a game's moves, and the move (ply, from 0) on which each taken piece fell. */
export type Replay = { pieces: BoardPiece[]; takenAt: ReadonlyMap<string, number> };

/**
 * Plays a game's moves (coordinate notation, from the starting position) onto the 32 pieces,
 * so every piece keeps its id from move to move and the board can slide it, castling rook and
 * promoted pawn included (components/chess/board-pieces.ts).
 */
export function replayMoves(moves: readonly string[]): Replay {
  let pieces = startingPieces();
  const takenAt = new Map<string, number>();
  moves.forEach((uci, ply) => {
    const played = playMove(pieces, uci);
    pieces = played.pieces;
    if (played.move.taken) takenAt.set(played.move.taken, ply);
  });
  return { pieces, takenAt };
}
