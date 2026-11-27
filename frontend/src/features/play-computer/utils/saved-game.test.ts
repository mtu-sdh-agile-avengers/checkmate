import { describe, expect, it, vi } from 'vitest';
import { FOOLS_MATE_ANALYSIS, FOOLS_MATE_GAME } from '@/features/play-computer/api/analyse-game.fixtures';
import { loadFinishedGame, SAVED_GAME_KEY, saveAnalysis, saveFinishedGame } from '@/features/play-computer/utils/saved-game';

const store = (value: unknown) => window.localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(value));

describe('the last finished game, kept in the browser', () => {
  it('keeps a game, and gives it back', () => {
    expect(loadFinishedGame()).toBeNull();

    saveFinishedGame(FOOLS_MATE_GAME);

    expect(loadFinishedGame()).toEqual(FOOLS_MATE_GAME);
  });

  it('adds the engine’s review to the same game only', () => {
    saveFinishedGame(FOOLS_MATE_GAME);

    saveAnalysis('another-game', FOOLS_MATE_ANALYSIS);
    expect(loadFinishedGame()?.analysis).toBeUndefined();

    saveAnalysis(FOOLS_MATE_GAME.id, FOOLS_MATE_ANALYSIS);
    expect(loadFinishedGame()?.analysis).toEqual(FOOLS_MATE_ANALYSIS);
  });

  it('ignores what does not read as a game (older or edited data)', () => {
    for (const value of [
      'not json',
      null,
      42,
      { ...FOOLS_MATE_GAME, level: 'grandmaster' },
      { ...FOOLS_MATE_GAME, moves: ['f2f3', 7] },
      { ...FOOLS_MATE_GAME, history: ['f3'] },
      { ...FOOLS_MATE_GAME, result: null },
      { ...FOOLS_MATE_GAME, result: { outcome: 'won', title: 'You Win', reason: 'by checkmate' } },
      { ...FOOLS_MATE_GAME, analysis: { engine: 'Stockfish 17', moves: [] } },
      { ...FOOLS_MATE_GAME, analysis: 'none' },
    ]) {
      if (value === 'not json') window.localStorage.setItem(SAVED_GAME_KEY, '{oops');
      else store(value);
      expect(loadFinishedGame()).toBeNull();
    }
  });

  it('does without storage (a private window): nothing kept, nothing breaks', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => saveFinishedGame(FOOLS_MATE_GAME)).not.toThrow();
    expect(loadFinishedGame()).toBeNull();

    setItem.mockRestore();
    getItem.mockRestore();
  });
});
