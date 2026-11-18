import { useQuery } from '@tanstack/react-query';
import { getOverall } from '@/features/overall-statistics/api/get-overall';
import type { TimeClass } from '@/types/chess';

export function useOverall(username: string, timeClass: TimeClass) {
  return useQuery({
    queryKey: ['overall', username, timeClass],
    queryFn: () => getOverall(username, timeClass),
    enabled: Boolean(username),
  });
}
