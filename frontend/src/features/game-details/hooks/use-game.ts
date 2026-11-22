import { useQuery } from '@tanstack/react-query';
import { getGame } from '@/features/game-details/api/get-game';
import type { GameArchive } from '@/features/game-details/api/get-game';

/** Game for the game page (CMG4-63); see `getGame` for the parameters. */
export function useGame(username: string, gameId: string, archive?: GameArchive) {
  return useQuery({
    queryKey: ['game', username, gameId, archive?.year ?? null, archive?.month ?? null],
    queryFn: () => getGame(username, gameId, archive),
  });
}
