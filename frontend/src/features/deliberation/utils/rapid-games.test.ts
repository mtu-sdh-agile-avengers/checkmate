import { describe, expect, it } from 'vitest';
import { playMove, startingPieces } from '@/components/chess/board-pieces';
import { RAPID_GAMES } from './rapid-games';

describe('rapid games', () => {
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
});
