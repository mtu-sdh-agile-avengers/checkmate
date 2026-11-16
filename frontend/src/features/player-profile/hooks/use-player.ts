import { useQuery } from '@tanstack/react-query';
import { getPlayer } from '@/features/player-profile/api/get-player';

export function usePlayer(username: string) {
  // No request until there is a username (the stage asks before a player has been chosen)
  return useQuery({ queryKey: ['player', username], queryFn: () => getPlayer(username), enabled: Boolean(username) });
}
