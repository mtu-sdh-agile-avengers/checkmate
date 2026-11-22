import type { GameDetailsDto } from '@/features/game-details/api/get-game';

// Our API response for hikaru's game 186299800014 (values from the real Chess.com snapshot
// used by the backend tests). The PGN is trimmed to the headers and the first moves.
export const HIKARU_GAME: GameDetailsDto = {
  id: '186299800014',
  url: 'https://www.chess.com/game/live/186299800014',
  timeClass: 'blitz',
  timeControl: '180',
  endTime: '2026-10-31T19:39:20Z',
  rated: true,
  rules: 'chess',
  color: 'white',
  result: 'win',
  player: { username: 'Hikaru', rating: 3453 },
  opponent: { username: 'Sina-Movahed', rating: 3299 },
  avgRating: 3376,
  pgn: [
    '[Event "Live Chess"]',
    '[Site "Chess.com"]',
    '[Date "2026.10.31"]',
    '[White "Hikaru"]',
    '[Black "Sina-Movahed"]',
    '[Result "1-0"]',
    '[WhiteElo "3453"]',
    '[BlackElo "3299"]',
    '[TimeControl "180"]',
    '[Termination "Hikaru won on time"]',
    '',
    '1. e4 {[%clk 0:03:00]} 1... c5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:02:59.3]} 2... d6 {[%clk 0:02:58.8]}',
  ].join('\n'),
  initialSetup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  fen: '8/6p1/6Pb/kP5P/8/8/3p4/3K1B2 b - - 7 79',
};
