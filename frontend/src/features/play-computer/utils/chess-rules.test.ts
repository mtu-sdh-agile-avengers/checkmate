import { describe, expect, it } from 'vitest';
import {
  applyUci,
  explainIllegal,
  inCheck,
  insufficientMaterial,
  isAttacked,
  kingSquare,
  opposite,
  parseFen,
  sanFor,
  toFen,
} from '@/features/play-computer/utils/chess-rules';
import { START_FEN } from '@/features/play-computer/utils/game-stats';

const start = parseFen(START_FEN);
const play = (fen: string, uci: string) => toFen(applyUci(parseFen(fen), uci));
const why = (fen: string, from: string, to: string) => explainIllegal(parseFen(fen), from, to);
const CASTLING = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

describe('chess rules on the page', () => {
  it('reads and writes positions', () => {
    expect(toFen(start)).toBe(START_FEN);
    expect(start.turn).toBe('white');
    expect(start.board.get('e1')).toEqual({ kind: 'king', side: 'white' });
    expect(start.board.get('d8')).toEqual({ kind: 'queen', side: 'black' });
    const later = parseFen('8/8/8/8/8/8/8/4K2k b - - 12 40');
    expect(later).toMatchObject({ turn: 'black', castling: '', enPassant: null, halfmove: 12, fullmove: 40 });
    expect(parseFen('4k3/8/8/8/8/8/8/4K3')).toMatchObject({ turn: 'white', halfmove: 0, fullmove: 1 });
    expect(opposite('white')).toBe('black');
  });

  it('sees which squares a side attacks, and a king in check', () => {
    expect(isAttacked(start.board, 'e3', 'white')).toBe(true); // the d- and f-pawns
    expect(isAttacked(start.board, 'e6', 'black')).toBe(true);
    expect(isAttacked(start.board, 'e4', 'white')).toBe(false);
    expect(isAttacked(start.board, 'f3', 'white')).toBe(true); // the g1 knight
    const rook = parseFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1').board;
    expect(isAttacked(rook, 'a8', 'white')).toBe(true);
    expect(isAttacked(rook, 'b2', 'white')).toBe(false);
    expect(isAttacked(parseFen('4k3/8/8/8/8/8/P7/R3K3 w - - 0 1').board, 'a8', 'white')).toBe(false); // blocked
    expect(isAttacked(parseFen('4k3/8/8/8/7b/8/8/4K3 w - - 0 1').board, 'e1', 'black')).toBe(true); // h4-e1 diagonal
    expect(isAttacked(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1').board, 'd7', 'black')).toBe(true); // the king
    expect(inCheck(parseFen('4k3/8/8/8/8/8/3p4/4K3 w - - 0 1'), 'white')).toBe(true); // a pawn, diagonally
    expect(inCheck(parseFen('4k3/8/8/8/8/8/4p3/4K3 w - - 0 1'), 'white')).toBe(false); // not straight ahead
    expect(inCheck(start, 'white')).toBe(false);
    expect(kingSquare(start.board, 'black')).toBe('e8');
    expect(kingSquare(parseFen('8/8/8/8/8/8/8/8 w - - 0 1').board, 'white')).toBeNull();
    expect(inCheck(parseFen('8/8/8/8/8/8/8/8 w - - 0 1'), 'white')).toBe(false);
  });

  it('plays moves: double steps, castling, en passant, promotion and the counters', () => {
    expect(play(START_FEN, 'e2e4')).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(play('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'g8f6')).toBe(
      'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
    );
    expect(play(CASTLING, 'e1g1')).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
    expect(play(CASTLING, 'e1c1')).toBe('r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1');
    // A rook leaving home, and one taken at home, lose their castling rights.
    expect(play(CASTLING, 'a1a8')).toBe('R3k2r/8/8/8/8/8/8/4K2R b Kk - 0 1');
    expect(play('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'e5f6')).toBe(
      'rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3',
    );
    expect(play('8/4P3/8/8/8/8/8/4K2k w - - 0 40', 'e7e8q')).toBe('4Q3/8/8/8/8/8/8/4K2k b - - 0 40');
    expect(applyUci(start, 'e4e5')).toBe(start); // no piece there: nothing happens
  });

  it('writes moves as a score sheet does', () => {
    expect(sanFor(start, 'e2e4', [])).toBe('e4');
    expect(sanFor(start, 'g1f3', [])).toBe('Nf3');
    expect(sanFor(parseFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'), 'e4d5', [])).toBe('exd5');
    expect(sanFor(parseFen('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'), 'e5f6', [])).toBe('exf6');
    // Two knights can reach d2: the file tells them apart; on one file, the rank.
    const knights = parseFen('rnbqkbnr/pppppppp/8/8/8/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1');
    expect(sanFor(knights, 'b1d2', ['b1d2', 'f3d2', 'e2e4'])).toBe('Nbd2');
    const stacked = parseFen('rnbqkbnr/pppppppp/8/6N1/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(sanFor(stacked, 'g1f3', ['g1f3', 'g5f3'])).toBe('N1f3');
    const queens = parseFen('4k3/8/8/8/8/Q7/8/Q1Q1K3 w - - 0 1');
    expect(sanFor(queens, 'a1b2', ['a1b2', 'a3b2', 'c1b2'])).toBe('Qa1b2');
    expect(sanFor(parseFen(CASTLING), 'e1g1', [])).toBe('O-O');
    expect(sanFor(parseFen(CASTLING), 'e1c1', [])).toBe('O-O-O');
    expect(sanFor(parseFen('8/4P3/8/8/8/8/8/4K2k w - - 0 40'), 'e7e8q', [])).toBe('e8=Q');
    // Scholar's mate gives check (the server's own notation makes it mate).
    expect(sanFor(parseFen('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'), 'h5f7', [])).toBe('Qxf7+');
    expect(sanFor(start, 'e4e5', [])).toBe('e4e5'); // no piece there
  });

  it('says how a piece moves when it cannot go there', () => {
    expect(why(START_FEN, 'd1', 'd2')).toBe('You can’t take your own piece.');
    expect(why(START_FEN, 'g1', 'g3')).toMatch(/^A knight moves in an L/);
    expect(why(START_FEN, 'c1', 'c3')).toBe('A bishop moves diagonally.');
    expect(why(START_FEN, 'a1', 'b3')).toBe('A rook moves along ranks and files.');
    expect(why(START_FEN, 'd1', 'b4')).toBe('A queen moves along ranks, files and diagonals.');
    expect(why(START_FEN, 'c1', 'e3')).toBe('The way is blocked: a bishop can’t jump over pieces.');
    expect(why(START_FEN, 'd1', 'd3')).toBe('The way is blocked: a queen can’t jump over pieces.');
    expect(why(START_FEN, 'e1', 'e3')).toBe('A king moves one square at a time.');
    expect(why(START_FEN, 'e4', 'e5')).toBe('There is no piece of yours there.');
  });

  it('explains what a pawn may and may not do', () => {
    expect(why(START_FEN, 'e2', 'e5')).toBe('A pawn moves straight ahead and takes diagonally.');
    expect(why(START_FEN, 'e2', 'd3')).toBe('A pawn only moves diagonally to take a piece.');
    expect(why('4k3/8/8/8/4p3/4P3/8/4K3 w - - 0 1', 'e3', 'e4')).toBe('A pawn can’t take straight ahead: it takes diagonally.');
    expect(why('4k3/8/8/8/8/4p3/4P3/4K3 w - - 0 1', 'e2', 'e4')).toBe('Something is in the pawn’s way.');
  });

  it('explains castling', () => {
    expect(why('r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1', 'e1', 'g1')).toBe('You can’t castle that way any more: your king or that rook has moved.');
    expect(why('r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1', 'e1', 'g1')).toBe('To castle, the squares between your king and the rook must be empty.');
    expect(why('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1', 'e1', 'c1')).toBe('To castle, the squares between your king and the rook must be empty.');
    expect(why('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1', 'g1')).toBe('You can’t castle out of check.');
    expect(why('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1', 'e1', 'g1')).toBe('Your king can’t castle through or into check.');
  });

  it('explains a move that would leave the king in check', () => {
    expect(why('4k3/8/8/8/8/8/5r2/4K3 w - - 0 1', 'e1', 'f1')).toBe('Your king would be in check.');
    expect(why('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1', 'e2', 'c3')).toBe('Your king would be in check: that knight is pinned.');
    expect(why('4k3/8/8/8/1b6/8/2P5/4K3 w - - 0 1', 'c2', 'c4')).toBe('Your king is in check, and that move doesn’t get it out.');
    // The server refused a move that looks fine here: it still gets an answer.
    expect(why(START_FEN, 'e2', 'e4')).toBe('That move isn’t allowed here.');
  });

  it('knows when neither side can checkmate', () => {
    const insufficient = (placement: string) => insufficientMaterial(parseFen(`${placement} w - - 0 1`).board);
    expect(insufficient('4k3/8/8/8/8/8/8/4K3')).toBe(true);
    expect(insufficient('4k3/8/8/8/8/8/8/4KN2')).toBe(true);
    expect(insufficient('4k3/8/8/8/8/8/8/2B1K3')).toBe(true);
    expect(insufficient('4kb2/8/8/8/8/8/8/2B1K3')).toBe(true); // bishops on dark squares both
    expect(insufficient('2b1k3/8/8/8/8/8/8/2B1K3')).toBe(false); // opposite colours
    expect(insufficient('4kn2/8/8/8/8/8/8/4KN2')).toBe(false);
    expect(insufficient('4k3/8/8/8/8/8/4P3/4K3')).toBe(false);
    expect(insufficient('4k3/8/8/8/8/8/8/R3K3')).toBe(false);
  });
});
