import { useQuery } from '@tanstack/react-query';
import { getPlayer } from '@/features/player-profile/api/get-player';

export function usePlayer(username: string) {
  return useQuery({ queryKey: ['player', username], queryFn: () => getPlayer(username) });
}
