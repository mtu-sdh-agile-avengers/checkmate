import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockGetGameHistory } from '@/lib/mock-api';
import type { GameArchive, GameHistoryFilters, GameHistoryPage } from '@/types/chess';
import { formatUtc } from '@/utils/format';
import { toGameSummary, type GameDto } from '@/utils/games';

/** Response of GET /api/v1/players/{username}/games/list (backend: PaginatedGameListResponse). */
export type GameHistoryDto = {
  year: number | null; // archive month of the games; null when the player has no games
  month: number | null;
  items: GameDto[];
  pagingLimit: number;
  totalGames: number;
  totalPages: number;
  page: number;
  hasNext: boolean;
};

/**
 * Loads one page of the player's game history list (CMG4-14): the games of one monthly
 * archive (the latest one by default), filtered by time class, sorted and paged.
 *
 * @throws ApiError e.g. 404 "hikaru player data is not available / does not exist"
 */
export async function getGameHistory(
  username: string,
  filters: GameHistoryFilters = {},
): Promise<GameHistoryPage> {
  if (getApiMode() === 'mock') return mockGetGameHistory(username, filters);

  const dto = await apiGet<GameHistoryDto>(
    `/players/${encodeURIComponent(username)}/games/list`,
    toQueryParams(filters),
  );
  return toGameHistoryPage(dto);
}

/** Only the filters that are set become query params (the backend has defaults for the rest). */
export function toQueryParams(filters: GameHistoryFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.archive) {
    params.year = String(filters.archive.year);
    params.month = String(filters.archive.month);
  }
  if (filters.timeClass) params.timeClass = filters.timeClass;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  if (filters.pageSize) params.pagingLimit = String(filters.pageSize);
  if (filters.page) params.page = String(filters.page);
  return params;
}

/** Maps the API response to the shape the game history list uses. */
export function toGameHistoryPage(dto: GameHistoryDto): GameHistoryPage {
  const archive: GameArchive | null =
    dto.year !== null && dto.month !== null ? { year: dto.year, month: dto.month } : null;
  return {
    archive,
    items: dto.items.map((item) => {
      const game = toGameSummary(item);
      return {
        ...game,
        dateTime: formatUtc(game.endTime),
        // every game of the page comes from the same monthly archive; it opens the game page
        archive: archive ?? archiveOf(game.endTime),
      };
    }),
    pageSize: dto.pagingLimit,
    totalGames: dto.totalGames,
    totalPages: dto.totalPages,
    page: dto.page,
    hasNext: dto.hasNext,
  };
}

/** Archive month of a game: the month it ended, in UTC. */
function archiveOf(endTime: number): GameArchive {
  const date = new Date(endTime * 1000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}
