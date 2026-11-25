import { describe, expect, it } from 'vitest';
import { toGameState } from '@/features/play-computer/api/play-move';
import { AFTER_E4_E5 } from '@/features/play-computer/api/play-move.fixtures';
import { gameNote } from '@/features/play-computer/utils/game-note';

const game = toGameState(AFTER_E4_E5);

describe('game note', () => {
  it('tells the player what happened and what to do', () => {
    expect(gameNote(null, true, null)).toBe('Setting up the board…');
    expect(gameNote(game, true, null)).toBe('The computer is thinking…');
    expect(gameNote(game, false, null)).toBe('The computer played e5. Your move.');
    expect(gameNote({ ...game, check: true }, false, null)).toBe(
      'The computer played e5. Your move — you are in check.',
    );
    expect(gameNote(game, false, new Error('The computer can’t play right now.'))).toBe(
      'The computer can’t play right now.',
    );
  });

  it('announces the end of the game', () => {
    expect(gameNote({ ...game, status: 'checkmate', winner: 'white' }, false, null)).toBe(
      'Checkmate — you win!',
    );
    expect(gameNote({ ...game, status: 'checkmate', winner: 'black' }, false, null)).toBe(
      'Checkmate — the computer wins.',
    );
    expect(gameNote({ ...game, status: 'stalemate' }, false, null)).toContain('draw');
    expect(gameNote({ ...game, status: 'draw' }, false, null)).toBe('The game is a draw.');
  });
});
