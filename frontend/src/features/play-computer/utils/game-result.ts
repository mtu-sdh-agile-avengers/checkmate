import type { ComputerGameState } from '@/features/play-computer/api/play-move';
import { insufficientMaterial, parseFen } from '@/features/play-computer/utils/chess-rules';

/** How a game against the computer ended, from the player's side (White). */
export type GameResult = {
  outcome: 'win' | 'loss' | 'draw';
  title: 'You Win' | 'You Lose' | 'Draw';
  reason: string; // e.g. "by checkmate"
};

/**
 * The result once the game is over, or null while it goes on. The server ends the game by
 * checkmate, stalemate, insufficient material or the 50-move rule (it sends "draw" for the
 * last two, so the position tells them apart); threefold repetition is counted on the page.
 */
export function readResult(game: ComputerGameState | null, repetition: boolean): GameResult | null {
  if (!game) return null;
  if (game.status === 'checkmate') {
    return game.winner === 'white'
      ? { outcome: 'win', title: 'You Win', reason: 'by checkmate' }
      : { outcome: 'loss', title: 'You Lose', reason: 'by checkmate' };
  }
  if (game.status === 'stalemate') return { outcome: 'draw', title: 'Draw', reason: 'by stalemate' };
  if (game.status === 'draw') {
    const reason = insufficientMaterial(parseFen(game.fen).board) ? 'by insufficient material' : 'by the 50-move rule';
    return { outcome: 'draw', title: 'Draw', reason };
  }
  return repetition ? { outcome: 'draw', title: 'Draw', reason: 'by threefold repetition' } : null;
}
