import type { GameAnalysis } from '@/features/play-computer/api/analyse-game';
import { DIFFICULTY_LEVELS, type DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import type { GameResult } from '@/features/play-computer/utils/game-result';

/** The last finished game, kept in the browser so its review survives a reload. */
export type SavedGame = {
  id: string; // when the game started: tells one game from the next
  level: DifficultyId;
  moves: string[]; // every move in UCI, from the start
  history: string[]; // the same moves in SAN
  result: GameResult;
  analysis?: GameAnalysis; // the engine's review, once loaded: no second request after a reload
};

export const SAVED_GAME_KEY = 'checkmate:last-game';

const OUTCOMES = ['win', 'loss', 'draw'];

/** Keeps the game (replacing the one before). Nothing happens where storage is unavailable. */
export function saveFinishedGame(game: SavedGame): void {
  try {
    window.localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(game));
  } catch {
    // storage unavailable or full: the review still works for this visit
  }
}

/** The kept game, or null if there is none or it does not read as one (older or edited data). */
export function loadFinishedGame(): SavedGame | null {
  let data: unknown;
  try {
    data = JSON.parse(window.localStorage.getItem(SAVED_GAME_KEY) ?? 'null');
  } catch {
    return null;
  }
  return isSavedGame(data) ? data : null;
}

/** Adds the engine's review to the kept game, if it is still that game. */
export function saveAnalysis(id: string, analysis: GameAnalysis): void {
  const game = loadFinishedGame();
  if (game?.id === id) saveFinishedGame({ ...game, analysis });
}

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function isSavedGame(data: unknown): data is SavedGame {
  if (!data || typeof data !== 'object') return false;
  const game = data as Partial<Record<keyof SavedGame, unknown>>;
  const result = game.result as Partial<Record<keyof GameResult, unknown>> | null | undefined;
  return (
    typeof game.id === 'string' &&
    DIFFICULTY_LEVELS.some((level) => level.id === game.level) &&
    isStrings(game.moves) &&
    isStrings(game.history) &&
    game.moves.length === game.history.length &&
    typeof result === 'object' &&
    result !== null &&
    OUTCOMES.includes(result.outcome as string) &&
    typeof result.title === 'string' &&
    typeof result.reason === 'string' &&
    (game.analysis === undefined || isAnalysisOf(game.analysis, game.moves.length))
  );
}

function isAnalysisOf(analysis: unknown, moves: number): boolean {
  if (!analysis || typeof analysis !== 'object') return false;
  const { engine, moves: evaluated } = analysis as Partial<Record<keyof GameAnalysis, unknown>>;
  return typeof engine === 'string' && Array.isArray(evaluated) && evaluated.length === moves;
}
