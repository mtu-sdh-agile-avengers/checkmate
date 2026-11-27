import { describe, expect, it } from 'vitest';
import type { MoveEvaluation } from '@/features/play-computer/api/analyse-game';
import { FOOLS_MATE_ANALYSIS } from '@/features/play-computer/api/analyse-game.fixtures';
import {
  chancesOf,
  countMarks,
  describeEvaluation,
  formatEvaluation,
  markOf,
  moveLabel,
  pivotalMoments,
  whiteChance,
} from '@/features/play-computer/utils/review';

/** A move of a made-up game: by `color`, evaluated `evalCp` (White's view) after it. */
const move = (ply: number, evalCp: number, extra: Partial<MoveEvaluation> = {}): MoveEvaluation => ({
  ply,
  moveNumber: Math.ceil(ply / 2),
  color: ply % 2 === 1 ? 'white' : 'black',
  san: `m${ply}`,
  uci: 'a2a3',
  fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  evalCp,
  mateIn: null,
  bestMoveSan: `m${ply}`,
  bestMoveUci: 'a2a3',
  category: 'good',
  ...extra,
});

describe('review of a game', () => {
  it('flags blunders, misses (as mistakes) and inaccuracies, not good or best moves', () => {
    expect(markOf('blunder')).toBe('blunder');
    expect(markOf('miss')).toBe('mistake');
    expect(markOf('inaccuracy')).toBe('inaccuracy');
    expect(markOf('good')).toBeNull();
    expect(markOf('best')).toBeNull();
  });

  it('turns evaluations into White’s winning chances', () => {
    expect(whiteChance(null)).toBe(0.5);
    expect(whiteChance({ evalCp: 0, mateIn: null })).toBe(0.5);
    expect(whiteChance({ evalCp: 100, mateIn: null })).toBeCloseTo(0.59, 2);
    expect(whiteChance({ evalCp: -500, mateIn: null })).toBeCloseTo(0.137, 2);
    // far beyond the curve's end, the same as at its end
    expect(whiteChance({ evalCp: 5000, mateIn: null })).toBe(whiteChance({ evalCp: 1000, mateIn: null }));
    expect(whiteChance({ evalCp: 9997, mateIn: 3 })).toBe(1);
    expect(whiteChance({ evalCp: -9998, mateIn: -2 })).toBe(0);
    expect(whiteChance({ evalCp: 10000, mateIn: 0 })).toBe(1); // White has mated
    expect(whiteChance({ evalCp: -10000, mateIn: 0 })).toBe(0);
    expect(chancesOf(FOOLS_MATE_ANALYSIS.moves)).toHaveLength(5);
    expect(chancesOf(FOOLS_MATE_ANALYSIS.moves)[0]).toBe(0.5);
  });

  it('writes the evaluation as chess players do', () => {
    expect(formatEvaluation(null)).toBe('0.0');
    expect(formatEvaluation({ evalCp: 4, mateIn: null })).toBe('0.0');
    expect(formatEvaluation({ evalCp: 131, mateIn: null })).toBe('+1.3');
    expect(formatEvaluation({ evalCp: -40, mateIn: null })).toBe('−0.4');
    expect(formatEvaluation({ evalCp: 9997, mateIn: 3 })).toBe('M3');
    expect(formatEvaluation({ evalCp: -9998, mateIn: -2 })).toBe('−M2');
    expect(formatEvaluation({ evalCp: 10000, mateIn: 0 })).toBe('1-0');
    expect(formatEvaluation({ evalCp: -10000, mateIn: 0 })).toBe('0-1');
  });

  it('says it in words, from the player’s side (White)', () => {
    expect(describeEvaluation(null)).toBe('The starting position');
    expect(describeEvaluation({ evalCp: 20, mateIn: null })).toBe('About level');
    expect(describeEvaluation({ evalCp: 90, mateIn: null })).toBe('You are slightly better');
    expect(describeEvaluation({ evalCp: -200, mateIn: null })).toBe('The computer is better');
    expect(describeEvaluation({ evalCp: 450, mateIn: null })).toBe('You are winning');
    expect(describeEvaluation({ evalCp: 9998, mateIn: 2 })).toBe('You can force mate in 2');
    expect(describeEvaluation({ evalCp: -9999, mateIn: -1 })).toBe('The computer can force mate in 1');
    expect(describeEvaluation({ evalCp: 10000, mateIn: 0 })).toBe('Checkmate: you won');
    expect(describeEvaluation({ evalCp: -10000, mateIn: 0 })).toBe('Checkmate: the computer won');
  });

  it('counts the flags of each side', () => {
    expect(countMarks(FOOLS_MATE_ANALYSIS.moves)).toEqual({
      white: { blunder: 1, mistake: 0, inaccuracy: 1 },
      black: { blunder: 0, mistake: 0, inaccuracy: 0 },
    });
  });

  it('labels a move by its number, with an ellipsis for Black', () => {
    expect(moveLabel({ moveNumber: 23, color: 'white', san: 'Qxf7' })).toBe('Move 23 Qxf7');
    expect(moveLabel({ moveNumber: 23, color: 'black', san: 'Nf6' })).toBe('Move 23… Nf6');
  });

  it('finds the turning points and says what each did, with the better move', () => {
    expect(pivotalMoments(FOOLS_MATE_ANALYSIS.moves)).toEqual([
      { ply: 3, side: 'white', mark: 'blunder', swing: expect.closeTo(0.454, 2), text: 'Move 2 g4 allowed a forced mate in 1; best was Nc3' },
    ]);
  });

  it('tells the kinds of turning points apart, from each side', () => {
    const game = [
      move(1, 400), // White wins ground: no drop for the mover
      move(2, 0, { category: 'blunder', bestMoveSan: 'Kg7' }), // Black wins it back: no drop either
      move(3, -20, { category: 'miss', bestMoveSan: 'Rd1' }), // a drop, but too small to turn anything
    ];
    expect(pivotalMoments(game)).toEqual([]);

    const swings = [
      move(1, 500), // White winning (from level: a gain, not a drop)
      move(2, 520), // Black, losing, makes it worse: "made a difficult position worse"? drop small
      move(3, 0, { category: 'blunder', bestMoveSan: 'Qd5' }), // White: winning → level
      move(4, 600, { category: 'blunder', bestMoveSan: 'Re8' }), // Black: level → losing
      move(5, -600, { category: 'blunder', bestMoveSan: 'Bf4' }), // White: winning → losing
      move(6, -300, { category: 'miss', bestMoveSan: 'Rf2' }), // Black: winning, less so
      move(7, -700, { category: 'inaccuracy', bestMoveSan: 'h3' }), // White: losing, worse
    ];
    const texts = pivotalMoments(swings, 10).map((moment) => moment.text);
    expect(texts).toEqual([
      'Move 2 m3 lost the advantage; best was Qd5',
      'Move 2… m4 gave you the advantage; best was Re8',
      'Move 3 m5 threw away a winning position; best was Bf4',
      'Move 3… m6 let part of the advantage slip; best was Rf2',
      'Move 4 m7 made a difficult position worse; best was h3',
    ]);
    // the three biggest, in the order they were played
    expect(pivotalMoments(swings).map((moment) => moment.ply)).toEqual([3, 4, 5]);
  });

  it('notices a forced mate let go, a level game slipping, and a move that was the best anyway', () => {
    const game = [
      move(1, 9997, { mateIn: 3 }), // White has a mate in 3
      move(2, 9998, { mateIn: 2 }),
      move(3, 300, { category: 'blunder', bestMoveSan: 'Qh7+' }), // White misses it
      move(4, 300),
      move(5, 0),
      move(6, 0),
      move(7, -120, { category: 'inaccuracy', bestMoveSan: 'm7' }), // level, a little worse: best anyway
    ];
    expect(pivotalMoments(game, 10).map((moment) => moment.text)).toEqual([
      'Move 2 m3 missed a forced mate; best was Qh7+',
      'Move 3 m5 lost the advantage',
      'Move 4 m7 lost ground',
    ]);
  });
});
