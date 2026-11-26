import { describe, expect, it } from 'vitest';
import { playMove, startingPieces, type BoardPiece } from './board-pieces';

const play = (moves: readonly string[]) =>
  moves.reduce<{ pieces: BoardPiece[]; taken: string[] }>(
    ({ pieces, taken }, uci) => {
      const next = playMove(pieces, uci);
      return { pieces: next.pieces, taken: next.move.taken ? [...taken, next.move.taken] : taken };
    },
    { pieces: startingPieces(), taken: [] },
  );
const on = (pieces: BoardPiece[], square: string) => pieces.find((piece) => !piece.taken && piece.square === square);

describe('board pieces', () => {
  it('sets out 32 pieces, each with its own id', () => {
    const pieces = startingPieces();
    expect(pieces).toHaveLength(32);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(32);
    expect(on(pieces, 'e1')?.id).toBe('white-king-e');
    expect(on(pieces, 'd8')?.id).toBe('black-queen-d');
  });

  it('takes the piece on the square moved to', () => {
    // Scholar's mate: the queen takes on f7.
    const { pieces, taken } = play(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']);
    expect(taken).toEqual(['black-pawn-f']);
    expect(on(pieces, 'f7')?.id).toBe('white-queen-d');
  });

  it('castles with the rook and takes en passant', () => {
    const castled = play(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'e1g1']).pieces;
    expect(on(castled, 'g1')?.id).toBe('white-king-e');
    expect(on(castled, 'f1')?.id).toBe('white-rook-h');

    const passant = play(['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6']);
    expect(passant.taken).toEqual(['black-pawn-d']);
    expect(on(passant.pieces, 'd6')?.id).toBe('white-pawn-e');
  });

  it('promotes a pawn reaching the last rank, keeping its id', () => {
    // 1. h4 g5 2. hxg5 h6 3. gxh6 Nf6 4. h7 Rg8 5. hxg8=N: the pawn takes the rook and becomes a knight.
    const { pieces, taken } = play(['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'g8f6', 'h6h7', 'h8g8', 'h7g8n']);
    expect(on(pieces, 'g8')).toMatchObject({ id: 'white-pawn-h', kind: 'knight', side: 'white' });
    expect(taken.at(-1)).toBe('black-rook-h');
  });

  it('refuses a move from an empty square or onto its own piece', () => {
    expect(() => playMove(startingPieces(), 'e4e5')).toThrow(/No piece on e4/);
    expect(() => playMove(startingPieces(), 'd1e1')).toThrow(/own piece/);
  });
});
