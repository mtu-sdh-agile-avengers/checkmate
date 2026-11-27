import { getApiMode } from '@/config/api';
import { apiPost } from '@/lib/api-client';
import type { PlayerColor } from '@/types/chess';

/** The engine's verdict on a move, from the mover's side (backend: MoveCategory). */
export type MoveCategory = 'best' | 'good' | 'inaccuracy' | 'miss' | 'blunder';

/** One half-move of POST /api/v1/computer/analysis (backend: ComputerMoveEvaluationResponse). */
export type MoveEvaluation = {
  ply: number; // 1 = White's first move
  moveNumber: number;
  color: PlayerColor; // who made the move
  san: string;
  uci: string;
  fen: string; // the position after the move
  evalCp: number; // after the move, White's view, in centipawns; a forced mate is ±(10000 - moves)
  mateIn: number | null; // forced mate after the move: > 0 White mates, < 0 Black mates, 0 checkmate
  bestMoveSan: string | null; // the engine's best move in the position before this one
  bestMoveUci: string | null;
  category: MoveCategory;
};

/** Response of POST /api/v1/computer/analysis (backend: ComputerGameAnalysisResponse). */
export type GameAnalysis = {
  engine: string; // "Stockfish 17", or "Built-in evaluator (approximate)" in dev mode
  depth: number;
  initialFen: string;
  moves: MoveEvaluation[];
};

/** The server runs the engine, so mock mode cannot review a game either. */
export const REVIEW_NEEDS_BACKEND_MESSAGE =
  'The review needs the backend: start it and set VITE_API_MODE=live in frontend/.env.';

/**
 * Sends the whole game (every move in UCI, from the start); the backend's engine evaluates every
 * position and says what was best.
 *
 * @throws ApiError e.g. 503 "Error during loading a game. Please try again" (the engine is down)
 */
export async function analyseComputerGame(moves: readonly string[]): Promise<GameAnalysis> {
  if (getApiMode() === 'mock') throw new Error(REVIEW_NEEDS_BACKEND_MESSAGE);
  return apiPost<GameAnalysis>('/computer/analysis', { moves });
}
