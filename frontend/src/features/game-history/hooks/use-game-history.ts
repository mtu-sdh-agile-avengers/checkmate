import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGameHistory } from '@/features/game-history/api/get-game-history';
import type { GameHistoryFilters } from '@/types/chess';

/**
 * One page of the game history list (CMG4-54 / CMG4-55). While another page or filter
 * loads, the previous page stays on screen (`isPlaceholderData` is true meanwhile).
 */
export function useGameHistory(username: string, filters: GameHistoryFilters = {}) {
  return useQuery({
    queryKey: ['game-history', username, filters],
    queryFn: () => getGameHistory(username, filters),
    enabled: Boolean(username),
    placeholderData: keepPreviousData,
  });
}
