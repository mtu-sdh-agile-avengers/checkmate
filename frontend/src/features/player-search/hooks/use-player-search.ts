import { useMutation } from '@tanstack/react-query';
import { searchPlayer } from '@/features/player-search/api/search-player';

export function usePlayerSearch() {
  return useMutation({ mutationFn: searchPlayer });
}
