import { describe, expect, it } from 'vitest';
import { playMove, RAPID_GAMES, startingPieces, type BoardPiece } from './rapid-games';

const play = (moves: readonly string[]) =>
  moves.reduce<{ pieces: BoardPiece[]; taken: string[] }>(
    ({ pieces, taken }, uci) => {
      const next = playMove(pieces, uci);
      return { pieces: next.pieces, taken: next.move.taken ? [...taken, next.move.taken] : taken };
    },
    { pieces: startingPieces(), taken: [] },
  );
const on = (pieces: BoardPiece[], square: string) => pieces.find((piece) => !piece.taken && piece.square === square)?.id;

describe('rapid games', () => {
  it('sets out 32 pieces, each with its own id', () => {
    const pieces = startingPieces();
    expect(pieces).toHaveLength(32);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(32);
    expect(on(pieces, 'e1')).toBe('white-king-e');
    expect(on(pieces, 'd8')).toBe('black-queen-d');
  });

  it('plays every game at the table from start to finish, each move by the side whose turn it is', () => {
    for (const game of RAPID_GAMES) {
      let pieces = startingPieces();
      game.forEach((uci, ply) => {
        const { pieces: next, move } = playMove(pieces, uci);
        expect(move.side).toBe(ply % 2 === 0 ? 'white' : 'black');
        pieces = next;
      });
    }
  });

  it('takes the piece on the square moved to', () => {
    // Scholar's mate: the queen takes on f7.
    const { pieces, taken } = play(RAPID_GAMES[0] ?? []);
    expect(taken).toEqual(['black-pawn-f']);
    expect(on(pieces, 'f7')).toBe('white-queen-d');
  });

  it('castles with the rook and takes en passant', () => {
    const castled = play(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'e1g1']).pieces;
    expect(on(castled, 'g1')).toBe('white-king-e');
    expect(on(castled, 'f1')).toBe('white-rook-h');

    const passant = play(['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6']);
    expect(passant.taken).toEqual(['black-pawn-d']);
    expect(on(passant.pieces, 'd6')).toBe('white-pawn-e');
  });

  it('refuses a move from an empty square or onto its own piece', () => {
    expect(() => playMove(startingPieces(), 'e4e5')).toThrow(/No piece on e4/);
    expect(() => playMove(startingPieces(), 'd1e1')).toThrow(/own piece/);
  });
});
