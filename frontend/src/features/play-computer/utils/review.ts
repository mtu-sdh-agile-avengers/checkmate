import type { MoveCategory, MoveEvaluation } from '@/features/play-computer/api/analyse-game';
import type { PlayerColor } from '@/types/chess';

/** The flags a review puts on a move, worst first. */
export type Mark = 'blunder' | 'mistake' | 'inaccuracy';

export const MARK_ORDER: readonly Mark[] = ['blunder', 'mistake', 'inaccuracy'];

export const MARKS: Record<Mark, { symbol: string; label: string; plural: string }> = {
  blunder: { symbol: '??', label: 'Blunder', plural: 'Blunders' },
  mistake: { symbol: '?', label: 'Mistake', plural: 'Mistakes' },
  inaccuracy: { symbol: '?!', label: 'Inaccuracy', plural: 'Inaccuracies' },
};

/** The engine's category as a flag. A "miss" (a pawn or more given away, or a clear chance
 *  let go) reads as a mistake; best and good moves carry no flag. */
export function markOf(category: MoveCategory): Mark | null {
  if (category === 'blunder') return 'blunder';
  if (category === 'miss') return 'mistake';
  if (category === 'inaccuracy') return 'inaccuracy';
  return null;
}

type Evaluated = Pick<MoveEvaluation, 'evalCp' | 'mateIn'>;

/** Centipawns beyond this count as this much: the curve is flat out there anyway. */
const CP_LIMIT = 1000;
/** Steepness of the curve from centipawns to winning chances (Lichess's). */
const CP_SCALE = 0.00368208;

/**
 * White's chances (0 to 1) after a move, as an evaluation bar draws them: the centipawns on a
 * logistic curve, so a pawn up early means about 59%, a rook up about 87%; a forced mate is
 * all or nothing. Before the first move (null), even.
 */
export function whiteChance(evaluation: Evaluated | null): number {
  if (!evaluation) return 0.5;
  const { evalCp, mateIn } = evaluation;
  if (mateIn !== null) {
    // 0: checkmate on the board; the sign of the score says who gave it
    const whiteMates = mateIn > 0 || (mateIn === 0 && evalCp > 0);
    return whiteMates ? 1 : 0;
  }
  const cp = Math.max(-CP_LIMIT, Math.min(CP_LIMIT, evalCp));
  return 1 / (1 + Math.exp(-CP_SCALE * cp));
}

/** White's chances in every position of the game: the start, then after each move. */
export function chancesOf(moves: readonly MoveEvaluation[]): number[] {
  return [0.5, ...moves.map(whiteChance)];
}

/**
 * The evaluation as chess players write it, from White's side: "+1.3", "−0.4", "0.0",
 * "M3" (White mates in 3), "−M2" (Black does), "1-0" / "0-1" once it is checkmate.
 */
export function formatEvaluation(evaluation: Evaluated | null): string {
  if (!evaluation) return '0.0';
  const { evalCp, mateIn } = evaluation;
  if (mateIn === 0) return evalCp > 0 ? '1-0' : '0-1';
  if (mateIn !== null) return mateIn > 0 ? `M${mateIn}` : `−M${-mateIn}`;
  const pawns = Math.round(evalCp / 10) / 10;
  if (pawns === 0) return '0.0';
  return `${pawns > 0 ? '+' : '−'}${Math.abs(pawns).toFixed(1)}`;
}

/** The evaluation in words, for the player (White): "You are better", "About level", ... */
export function describeEvaluation(evaluation: Evaluated | null): string {
  if (!evaluation) return 'The starting position';
  const { evalCp, mateIn } = evaluation;
  if (mateIn === 0) return evalCp > 0 ? 'Checkmate: you won' : 'Checkmate: the computer won';
  if (mateIn !== null) {
    return mateIn > 0 ? `You can force mate in ${mateIn}` : `The computer can force mate in ${-mateIn}`;
  }
  const size = Math.abs(evalCp);
  if (size < 50) return 'About level';
  const how = size < 150 ? 'slightly better' : size < 300 ? 'better' : 'winning';
  return evalCp > 0 ? `You are ${how}` : `The computer is ${how}`;
}

export type MarkCounts = Record<Mark, number>;

/** How many moves of each side were flagged, by flag. */
export function countMarks(moves: readonly MoveEvaluation[]): Record<PlayerColor, MarkCounts> {
  const counts: Record<PlayerColor, MarkCounts> = {
    white: { blunder: 0, mistake: 0, inaccuracy: 0 },
    black: { blunder: 0, mistake: 0, inaccuracy: 0 },
  };
  for (const move of moves) {
    const mark = markOf(move.category);
    if (mark) counts[move.color][mark] += 1;
  }
  return counts;
}

/** "Move 23 Qxf7" for White's move, "Move 23… Nf6" for Black's. */
export function moveLabel(move: Pick<MoveEvaluation, 'moveNumber' | 'color' | 'san'>): string {
  return `Move ${move.moveNumber}${move.color === 'black' ? '…' : ''} ${move.san}`;
}

/** A move that changed the course of the game, and what it did, in a sentence. */
export type PivotalMoment = {
  ply: number;
  side: PlayerColor;
  mark: Mark | null;
  /** How much the mover's chances dropped, 0 to 1. */
  swing: number;
  /** e.g. "Move 23 Qxf7 lost the advantage; best was Nd5" */
  text: string;
};

/** The mover's chances dropping by this much is a turning point. */
const MIN_SWING = 0.1;
/** Chances (the mover's) from which a position counts as won, and up to which as lost. */
const WINNING = 0.65;
const LOSING = 0.35;

/** A position from one side's view: its chances, and a forced mate for or against it. */
type Standing = { chance: number; mate: 'for' | 'against' | null; mateIn: number | null };

function standing(evaluation: MoveEvaluation | null, side: PlayerColor): Standing {
  const white = whiteChance(evaluation);
  const mateIn = evaluation?.mateIn ?? null;
  const mate = mateIn === null || mateIn === 0 ? null : (mateIn > 0) === (side === 'white') ? 'for' : 'against';
  return { chance: side === 'white' ? white : 1 - white, mate, mateIn };
}

const zone = (chance: number) => (chance >= WINNING ? 'winning' : chance <= LOSING ? 'losing' : 'level');

/** What a move did to the mover's position, from the positions before and after it. */
function whatItDid(before: Standing, after: Standing, side: PlayerColor): string {
  if (after.mate === 'against' && before.mate !== 'against') {
    return `allowed a forced mate in ${Math.abs(after.mateIn ?? 0)}`;
  }
  if (before.mate === 'for' && after.mate !== 'for') return 'missed a forced mate';
  const from = zone(before.chance);
  const to = zone(after.chance);
  if (from === 'winning' && to === 'losing') return 'threw away a winning position';
  if (from === 'winning' && to === 'level') return 'lost the advantage';
  if (from === 'level' && to === 'losing') return `gave ${side === 'white' ? 'the computer' : 'you'} the advantage`;
  if (from === 'losing') return 'made a difficult position worse';
  if (from === 'winning') return 'let part of the advantage slip';
  return 'lost ground';
}

/**
 * The moves that changed the game most: those after which the mover's chances dropped the
 * most (at least 10 points), the biggest `limit` of them, in the order they were played. Each
 * says what it did and, when the engine preferred another move, which:
 * "Move 23 Qxf7 lost the advantage; best was Nd5".
 */
export function pivotalMoments(moves: readonly MoveEvaluation[], limit = 3): PivotalMoment[] {
  const moments = moves.map((move, index): PivotalMoment => {
    const before = standing(moves[index - 1] ?? null, move.color);
    const after = standing(move, move.color);
    const better = move.bestMoveSan && move.bestMoveSan !== move.san ? `; best was ${move.bestMoveSan}` : '';
    return {
      ply: move.ply,
      side: move.color,
      mark: markOf(move.category),
      swing: before.chance - after.chance,
      text: `${moveLabel(move)} ${whatItDid(before, after, move.color)}${better}`,
    };
  });
  return moments
    .filter((moment) => moment.swing >= MIN_SWING)
    .sort((a, b) => b.swing - a.swing || a.ply - b.ply)
    .slice(0, limit)
    .sort((a, b) => a.ply - b.ply);
}
