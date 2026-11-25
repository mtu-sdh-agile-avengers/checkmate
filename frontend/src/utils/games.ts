import type { GameResult, GameSummary, PlayerColor, TimeClass } from '@/types/chess';
import { formatDay, formatTimeControl } from '@/utils/format';

/** One game as our API returns it (backend: GameResponse), seen by the requested player. */
export type GameDto = {
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
};

/** Maps a game of the API to what the game list and the game page show. */
export function toGameSummary(dto: GameDto): GameSummary {
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
  };
}
