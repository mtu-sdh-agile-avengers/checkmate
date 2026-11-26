import { describe, expect, it } from 'vitest';
import { replayMoves } from '@/features/play-computer/utils/board-replay';

describe('board replay', () => {
  it('sets out the pieces for a new game', () => {
    const { pieces, takenAt } = replayMoves([]);
    expect(pieces).toHaveLength(32);
    expect(takenAt.size).toBe(0);
  });

  it('moves each piece by its id and remembers when a piece was taken', () => {
    // 1. e4 d5 2. exd5 Qxd5: White's pawn takes on move 2 (ply 2), Black's queen on ply 3.
    const { pieces, takenAt } = replayMoves(['e2e4', 'd7d5', 'e4d5', 'd8d5']);
    expect(pieces.find((piece) => piece.square === 'd5' && !piece.taken)?.id).toBe('black-queen-d');
    expect(takenAt.get('black-pawn-d')).toBe(2);
    expect(takenAt.get('white-pawn-e')).toBe(3);
  });
});
