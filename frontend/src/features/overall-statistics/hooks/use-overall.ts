import { useQuery } from '@tanstack/react-query';
import { getOverall } from '@/features/overall-statistics/api/get-overall';

export function useOverall(username: string) {
  return useQuery({ queryKey: ['overall', username], queryFn: () => getOverall(username) });
}
