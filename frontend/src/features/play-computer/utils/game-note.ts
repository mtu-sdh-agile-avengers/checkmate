import type { ComputerGameState } from '@/features/play-computer/api/play-move';

/** What the panel says about the game, e.g. "The computer played e5. Your move." */
export function gameNote(
  game: ComputerGameState | null,
  thinking: boolean,
  error: Error | null,
): string {
  if (error) return error.message;
  if (!game) return 'Setting up the board…';
  if (thinking) return 'The computer is thinking…';
  if (game.status === 'checkmate')
    return game.winner === 'white' ? 'Checkmate — you win!' : 'Checkmate — the computer wins.';
  if (game.status === 'stalemate') return 'Stalemate — the game is a draw.';
  if (game.status === 'draw') return 'The game is a draw.';
  const reply = game.computerMove ? `The computer played ${game.computerMove.san}. ` : '';
  return `${reply}Your move${game.check ? ' — you are in check' : ''}.`;
}
