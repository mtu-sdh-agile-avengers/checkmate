import { describe, expect, it } from 'vitest';
import { positionKey, readGameStats, START_FEN } from '@/features/play-computer/utils/game-stats';

describe('game stats', () => {
  it('reads the starting position: full armies, level material, nothing taken', () => {
    const stats = readGameStats(START_FEN, 0);

    expect(stats.fullMoves).toBe(1);
    expect(stats.halfMoves).toBe(0);
    expect(stats.white).toEqual({ pieces: 16, material: 39, lost: [] });
    expect(stats.black).toEqual({ pieces: 16, material: 39, lost: [] });
    expect(stats.advantage).toEqual({ side: null, points: 0 });
  });

  it('counts a pawn traded each way: level again (1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5)', () => {
    const stats = readGameStats('rnb1kbnr/ppp1pppp/8/q7/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', 5);

    expect(stats.fullMoves).toBe(4);
    expect(stats.halfMoves).toBe(5);
    expect(stats.white).toEqual({ pieces: 15, material: 38, lost: ['pawn'] });
    expect(stats.black).toEqual({ pieces: 15, material: 38, lost: ['pawn'] });
    expect(stats.advantage.side).toBeNull();
  });

  it('gives the advantage to the side ahead, in pawns', () => {
    const knightUp = readGameStats('r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 3', 4);
    expect(knightUp.black.lost).toEqual(['knight']);
    expect(knightUp.advantage).toEqual({ side: 'white', points: 3 });

    const queenDown = readGameStats('rnbqkbnr/pppppppp/8/8/8/8/PP1PPP1P/1NB1KBNR w Kkq - 0 9', 16);
    // most valuable first, as a score sheet lists them
    expect(queenDown.white.lost).toEqual(['queen', 'rook', 'pawn', 'pawn']);
    expect(queenDown.advantage).toEqual({ side: 'black', points: 16 });
  });

  it('does not count a promoted pawn as taken', () => {
    // White's h-pawn queened on h8, taking the rook there.
    const stats = readGameStats('rnbqkbnQ/ppppppp1/8/8/8/8/PPPPPPP1/RNBQKBNR b KQq - 0 12', 22);

    expect(stats.white).toEqual({ pieces: 16, material: 47, lost: [] });
    expect(stats.black).toEqual({ pieces: 14, material: 33, lost: ['rook', 'pawn'] });
    expect(stats.advantage).toEqual({ side: 'white', points: 14 });
  });

  it('starts the move count at 1 when the position has no counters', () => {
    expect(readGameStats('4k3/8/8/8/8/8/8/4K3', 0).fullMoves).toBe(1);
    expect(readGameStats('4k3/8/8/8/8/8/8/4K3 w - - 0 x', 0).fullMoves).toBe(1);
  });

  it('compares positions without their move counters, as the repetition rule does', () => {
    expect(positionKey(START_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(positionKey('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 4 3')).toBe(positionKey(START_FEN));
  });
});
