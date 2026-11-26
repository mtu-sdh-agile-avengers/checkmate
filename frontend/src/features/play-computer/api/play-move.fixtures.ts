import type { ComputerMoveDto } from '@/features/play-computer/api/play-move';

// Our API response after 1. e4 e5 (backend: ComputerMoveResponse), legal moves shortened
export const AFTER_E4_E5: ComputerMoveDto = {
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  playerMove: { uci: 'e2e4', san: 'e4', fromSquare: 'e2', toSquare: 'e4' },
  computerMove: { uci: 'e7e5', san: 'e5', fromSquare: 'e7', toSquare: 'e5' },
  turn: 'white',
  legalMoves: ['d2d4', 'g1f3', 'g1h3'],
  check: false,
  status: 'playing',
  winner: null,
};

// Our API response when a game starts (no move yet): White to move, all 20 first moves
export const GAME_START: ComputerMoveDto = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playerMove: null,
  computerMove: null,
  turn: 'white',
  legalMoves: [
    'a2a3',
    'a2a4',
    'b1a3',
    'b1c3',
    'b2b3',
    'b2b4',
    'c2c3',
    'c2c4',
    'd2d3',
    'd2d4',
    'e2e3',
    'e2e4',
    'f2f3',
    'f2f4',
    'g1f3',
    'g1h3',
    'g2g3',
    'g2g4',
    'h2h3',
    'h2h4',
  ],
  check: false,
  status: 'playing',
  winner: null,
};
