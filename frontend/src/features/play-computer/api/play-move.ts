import { getApiMode } from '@/config/api';
import { apiPost } from '@/lib/api-client';
import type { DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import type { PlayerColor } from '@/types/chess';

/** A move as the API describes it. */
export type PlayedMoveDto = { uci: string; san: string; fromSquare: string; toSquare: string };

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

/** Response of POST /api/v1/computer/move (backend: ComputerMoveResponse). */
export type ComputerMoveDto = {
  fen: string;
  playerMove: PlayedMoveDto | null;
  computerMove: PlayedMoveDto | null;
  turn: PlayerColor;
  legalMoves: string[]; // the player's legal moves in UCI, e.g. "e2e4", "e7e8q"
  check: boolean;
  status: GameStatus;
  winner: PlayerColor | null;
};

/** The game after a move, as the In-Game Chess page shows it. */
export type ComputerGameState = ComputerMoveDto & {
  placement: string; // first field of the FEN, for the board
  lastMove: { from: string; to: string } | null; // highlighted on the board
};

export type PlayMoveInput = {
  fen?: string; // position before the move; the starting position when left out
  move?: string | null; // the player's move in UCI; leave out to start a game
  level: DifficultyId;
  playerColor?: PlayerColor;
};

/** The server knows the rules and plays the computer, so mock mode cannot play. */
export const NEEDS_BACKEND_MESSAGE =
  'Playing needs the backend: start it and set VITE_API_MODE=live in frontend/.env.';

/**
 * Sends the player's move; the backend checks it, lets the computer reply and returns the new
 * position with the player's legal moves.
 *
 * @throws ApiError e.g. 422 "This move is not allowed in this position." or 503 "The computer
 *   can't play right now. Please try again"
 */
export async function playComputerMove(input: PlayMoveInput): Promise<ComputerGameState> {
  if (getApiMode() === 'mock') throw new Error(NEEDS_BACKEND_MESSAGE);

  const dto = await apiPost<ComputerMoveDto>('/computer/move', {
    ...(input.fen ? { fen: input.fen } : {}),
    move: input.move ?? null,
    level: input.level,
    playerColor: input.playerColor ?? 'white',
  });
  return toGameState(dto);
}

/** Adds what the board needs: the piece placement and the move to highlight. */
export function toGameState(dto: ComputerMoveDto): ComputerGameState {
  const last = dto.computerMove ?? dto.playerMove;
  return {
    ...dto,
    placement: dto.fen.split(' ')[0] ?? dto.fen,
    lastMove: last ? { from: last.fromSquare, to: last.toSquare } : null,
  };
}
