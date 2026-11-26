import { describe, expect, it } from 'vitest';
import { readOpening, readPgn, toFullMoves } from './read-pgn';

const CHESS_COM_PGN = [
  '[Event "Live Chess"]',
  '[White "jumpingknight20"]',
  '[Black "Hikaru"]',
  '[Result "1-0"]',
  '[ECO "B16"]',
  '[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-Bronstein-Larsen-Variation-6.c3-Bf5"]',
  '[Termination "jumpingknight20 won by checkmate"]',
  '',
  '1. e4 {[%clk 0:00:59.6]} 1... c6 {[%clk 0:00:59.9]} 2. d4 {[%clk 0:00:58.7]} 2... d5 {[%clk 0:00:59.8]}',
  '3. Nc3 {[%clk 0:00:58.2]} 1-0',
].join('\n');

describe('read-pgn', () => {
  it('reads the tags and the moves of a Chess.com PGN, without the clock comments', () => {
    const game = readPgn(CHESS_COM_PGN);
    expect(game.tags.White).toBe('jumpingknight20');
    expect(game.tags.Termination).toBe('jumpingknight20 won by checkmate');
    expect(game.moves).toEqual(['e4', 'c6', 'd4', 'd5', 'Nc3']);
    expect(toFullMoves(game)).toEqual([
      { number: 1, white: 'e4', black: 'c6' },
      { number: 2, white: 'd4', black: 'd5' },
      { number: 3, white: 'Nc3', black: null },
    ]);
  });

  it('leaves out variations, annotations and ";" comments, and splits "1.e4"', () => {
    const game = readPgn('1.e4 e5 (1...c5 2.Nf3 (2.c3)) 2.Nf3!? $1 Nc6; a comment\n3.Bb5 a6 *');
    expect(game.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  });

  it('numbers a game that starts with Black to move', () => {
    const game = readPgn('[SetUp "1"]\n\n12... Qd7 13. Rd1 Qe6 0-1');
    expect(toFullMoves(game)).toEqual([
      { number: 12, white: null, black: 'Qd7' },
      { number: 13, white: 'Rd1', black: 'Qe6' },
    ]);
  });

  it('names the opening from the ECO tags', () => {
    expect(readOpening(readPgn(CHESS_COM_PGN).tags)).toBe('B16 · Caro Kann Defense Bronstein Larsen Variation 6.c3 Bf5');
    expect(readOpening({ ECO: 'C20' })).toBe('C20');
    expect(readOpening({})).toBeNull();
  });
});

describe('openings and move numbers, edge cases', () => {
  it('reads a broken opening link as no name', () => {
    expect(readOpening({ ECO: 'B16', ECOUrl: 'https://www.chess.com/openings/%E0%A4%A' })).toBe('B16');
    expect(readOpening({ ECO: '?' })).toBeNull();
  });

  it('starts the score sheet on a black move', () => {
    const game = readPgn('[FEN "x"]\n\n12... Nf6 13. Bg5 Be7 1-0');
    expect(game.firstMove).toEqual({ number: 12, black: true });
    expect(toFullMoves(game)).toEqual([
      { number: 12, white: null, black: 'Nf6' },
      { number: 13, white: 'Bg5', black: 'Be7' },
    ]);
  });
});
