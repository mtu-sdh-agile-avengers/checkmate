import { describe, expect, it } from 'vitest';
import { toGameState } from '@/features/play-computer/api/play-move';
import { AFTER_E4_E5 } from '@/features/play-computer/api/play-move.fixtures';
import { readResult } from '@/features/play-computer/utils/game-result';

const game = toGameState(AFTER_E4_E5);

describe('game result', () => {
  it('is nothing while the game goes on', () => {
    expect(readResult(null, false)).toBeNull();
    expect(readResult(game, false)).toBeNull();
  });

  it('names the winner of a checkmate from the player’s side', () => {
    expect(readResult({ ...game, status: 'checkmate', winner: 'white' }, false)).toEqual({ outcome: 'win', title: 'You Win', reason: 'by checkmate' });
    expect(readResult({ ...game, status: 'checkmate', winner: 'black' }, false)).toEqual({ outcome: 'loss', title: 'You Lose', reason: 'by checkmate' });
  });

  it('gives the reason for a draw', () => {
    expect(readResult({ ...game, status: 'stalemate' }, false)?.reason).toBe('by stalemate');
    expect(readResult({ ...game, status: 'draw', fen: '4k3/8/8/8/8/8/8/4KB2 b - - 0 60' }, false)).toEqual({
      outcome: 'draw',
      title: 'Draw',
      reason: 'by insufficient material',
    });
    expect(readResult({ ...game, status: 'draw', fen: '4k3/8/8/8/8/8/8/R3K3 b - - 100 90' }, false)?.reason).toBe('by the 50-move rule');
    expect(readResult(game, true)?.reason).toBe('by threefold repetition');
  });
});
