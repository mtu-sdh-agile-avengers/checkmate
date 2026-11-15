import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockGetGame } from '@/lib/mock-api';
import type { GameDetails, GameResult, PlayerColor, TimeClass } from '@/types/chess';
import { formatDay, formatTimeControl } from '@/utils/format';

/** Response of GET /api/v1/players/{username}/games/ (backend: GameBoardDetailsResponse). */
export type GameDetailsDto = {
  id: string;
  url: string;
  timeClass: TimeClass;
  timeControl: string; // "<base seconds>[+<increment>]", daily: "1/<seconds per move>"
  endTime: string; // ISO date-time (UTC)
  rated: boolean;
  rules: string;
  color: PlayerColor; // color of the requested player
  result: GameResult; // result of the requested player
  player: { username: string; rating: number };
  opponent: { username: string; rating: number };
  avgRating: number;
  pgn: string;
  initialSetup: string; // FEN
  fen: string; // FEN of the final position
};

/** Chess.com monthly archive of a game: the month the game ended (UTC). */
export type GameArchive = { year: number; month: number };

/**
 * Loads one game of the player for the game page.
 *
 * @param gameId Chess.com game id (or game URL)
 * @param archive archive month of the game; without it the backend looks in the latest month.
 *   The game history list (CMG4-14) gives it for every game, so pass it when you have it.
 * @throws ApiError e.g. 404 "Game 123 was not found in hikaru's games from 2026-10"
 */
export async function getGame(
  username: string,
  gameId: string,
  archive?: GameArchive,
): Promise<GameDetails> {
  if (getApiMode() === 'mock') return mockGetGame(username, gameId, archive);

  const params: Record<string, string> = { search: gameId };
  if (archive) {
    params.year = String(archive.year);
    params.month = String(archive.month);
  }
  const dto = await apiGet<GameDetailsDto>(
    `/players/${encodeURIComponent(username)}/games/`,
    params,
  );
  return toGameDetails(dto);
}

/** Maps the API response to the shape the game page uses. */
export function toGameDetails(dto: GameDetailsDto): GameDetails {
  const endTime = new Date(dto.endTime);
  const opponentColor: PlayerColor = dto.color === 'white' ? 'black' : 'white';
  return {
    id: dto.id,
    url: dto.url,
    timeClass: dto.timeClass,
    timeControl: formatTimeControl(dto.timeControl),
    endTime: Math.floor(endTime.getTime() / 1000),
    date: formatDay(endTime),
    rated: dto.rated,
    rules: dto.rules,
    result: dto.result,
    player: { ...dto.player, color: dto.color },
    opponent: { ...dto.opponent, color: opponentColor },
    averageRating: dto.avgRating,
    pgn: dto.pgn,
    initialFen: dto.initialSetup,
    finalFen: dto.fen,
  };
}
