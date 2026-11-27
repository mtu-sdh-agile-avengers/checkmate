import type { GameAnalysis } from '@/features/play-computer/api/analyse-game';
import type { SavedGame } from '@/features/play-computer/utils/saved-game';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** 1. f3 e5 2. g4 Qh4#: the fool's mate, as a finished game kept for its review. */
export const FOOLS_MATE_GAME: SavedGame = {
  id: 'fools-mate',
  level: 'intermediate',
  moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
  history: ['f3', 'e5', 'g4', 'Qh4#'],
  result: { outcome: 'loss', title: 'You Lose', reason: 'by checkmate' },
};

// Our API's analysis of it (backend: ComputerGameAnalysisResponse): f3 an inaccuracy, g4 the
// blunder that allows the mate (Nc3 was best), Qh4# the mate.
export const FOOLS_MATE_ANALYSIS: GameAnalysis = {
  engine: 'Stockfish 17',
  depth: 18,
  initialFen: START_FEN,
  moves: [
    {
      ply: 1, moveNumber: 1, color: 'white', san: 'f3', uci: 'f2f3',
      fen: 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
      evalCp: -60, mateIn: null, bestMoveSan: 'e4', bestMoveUci: 'e2e4', category: 'inaccuracy',
    },
    {
      ply: 2, moveNumber: 1, color: 'black', san: 'e5', uci: 'e7e5',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
      evalCp: -50, mateIn: null, bestMoveSan: 'e5', bestMoveUci: 'e7e5', category: 'best',
    },
    {
      ply: 3, moveNumber: 2, color: 'white', san: 'g4', uci: 'g2g4',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
      evalCp: -9999, mateIn: -1, bestMoveSan: 'Nc3', bestMoveUci: 'b1c3', category: 'blunder',
    },
    {
      ply: 4, moveNumber: 2, color: 'black', san: 'Qh4#', uci: 'd8h4',
      fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
      evalCp: -10000, mateIn: 0, bestMoveSan: 'Qh4#', bestMoveUci: 'd8h4', category: 'best',
    },
  ],
};
